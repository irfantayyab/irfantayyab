type Value =
  | { kind: "string"; text: string }
  | { kind: "regex" }
  | { kind: "range"; text: string }
  | { kind: "word"; text: string };

type Token =
  | { kind: "option"; key: string; value: Value }
  | { kind: "marker"; value: Value }
  | { kind: "unknown"; text: string };

const frames = new Set(["code", "terminal", "none", "auto"]);
const booleans = new Set(["true", "false"]);
const markers = new Set(["mark", "ins", "del"]);

function readValue(meta: string, start: number): [Value, number] | undefined {
  const char = meta[start];
  if (char === '"' || char === "'") {
    const end = meta.indexOf(char, start + 1);
    return end < 0
      ? undefined
      : [{ kind: "string", text: meta.slice(start + 1, end) }, end + 1];
  }
  if (char === "/") {
    let end = start + 1;
    while (end < meta.length && meta[end] !== "/") {
      end += meta[end] === "\\" ? 2 : 1;
    }
    return end >= meta.length ? undefined : [{ kind: "regex" }, end + 1];
  }
  if (char === "{") {
    const end = meta.indexOf("}", start);
    return end < 0
      ? undefined
      : [{ kind: "range", text: meta.slice(start + 1, end) }, end + 1];
  }
  const word = /^\S+/.exec(meta.slice(start))?.[0] ?? "";
  return [{ kind: "word", text: word }, start + word.length];
}

function tokenize(meta: string): Token[] | undefined {
  const tokens: Token[] = [];
  let at = 0;
  while (at < meta.length) {
    if (/\s/.test(meta[at] ?? "")) {
      at += 1;
      continue;
    }
    const key = /^([A-Za-z]+)=/.exec(meta.slice(at));
    if (key?.[1]) {
      const read = readValue(meta, at + key[0].length);
      if (!read) {
        return undefined;
      }
      tokens.push({ kind: "option", key: key[1], value: read[0] });
      at = read[1];
      continue;
    }
    if ("\"'/{".includes(meta[at] ?? "")) {
      const read = readValue(meta, at);
      if (!read) {
        return undefined;
      }
      tokens.push({ kind: "marker", value: read[0] });
      at = read[1];
      continue;
    }
    const word = /^\S+/.exec(meta.slice(at))?.[0] ?? "";
    tokens.push({ kind: "unknown", text: word });
    at += word.length;
  }
  return tokens;
}

function checkRange(range: string, lines: number, problems: string[]) {
  for (const part of range.split(",").map((piece) => piece.trim())) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) {
      problems.push(`"{${range}}" is not a line range like {2} or {1,4-6}`);
      return;
    }
    const first = Number(match[1]);
    const last = Number(match[2] ?? match[1]);
    if (first < 1 || last < first) {
      problems.push(`"{${range}}" has a range that runs backwards or from 0`);
      return;
    }
    if (last > lines) {
      problems.push(
        `"{${range}}" points past the block's last line, line ${lines}`,
      );
      return;
    }
  }
}

function checkMarker(value: Value, lines: number, problems: string[]) {
  if (value.kind === "range") {
    checkRange(value.text, lines, problems);
  } else if (value.kind === "word") {
    problems.push(
      `"${value.text}" marks nothing; quote text, or give lines as {2}`,
    );
  }
}

export function checkFenceMeta(
  meta: string,
  lines: number,
  isLanguage: (lang: string) => boolean,
): string[] {
  const tokens = tokenize(meta);
  if (!tokens) {
    return [`the options "${meta}" have an unclosed quote, /regex/ or {range}`];
  }
  const problems: string[] = [];
  for (const token of tokens) {
    if (token.kind === "unknown") {
      problems.push(`"${token.text}" is no code block option`);
    } else if (token.kind === "marker") {
      checkMarker(token.value, lines, problems);
    } else {
      const { key, value } = token;
      const text = value.kind === "regex" ? "" : value.text;
      if (key === "title") {
        if (value.kind === "regex" || value.kind === "range" || !text.trim()) {
          problems.push(`title needs text, as title="file.ts"`);
        }
      } else if (markers.has(key)) {
        checkMarker(value, lines, problems);
      } else if (key === "frame") {
        if (!frames.has(text)) {
          problems.push(
            `frame="${text}" is none of code, terminal, none or auto`,
          );
        }
      } else if (key === "wrap" || key === "preserveIndent") {
        if (!booleans.has(text)) {
          problems.push(`${key}="${text}" is neither true nor false`);
        }
      } else if (key === "hangingIndent") {
        if (!/^\d+$/.test(text)) {
          problems.push(`hangingIndent="${text}" is not a whole number`);
        }
      } else if (key === "lang") {
        if (!isLanguage(text)) {
          problems.push(`lang="${text}" is a language Shiki does not know`);
        }
      } else {
        problems.push(`"${key}=" is no code block option`);
      }
    }
  }
  return problems;
}
