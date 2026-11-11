import { MetaOptions } from "expressive-code";

const frames = new Set(["code", "terminal", "none", "auto"]);
const markers = new Set(["mark", "ins", "del"]);
const settings = new Set(["wrap", "preserveindent", "hangingindent"]);

type Option = ReturnType<MetaOptions["list"]>[number];

function textOf(option: Option) {
  return option.kind === "regexp" ? option.value.source : String(option.value);
}

function looksUndelimited(text: string) {
  return /^["'{/]/.test(text);
}

function checkRange(range: string, lines: number, problems: string[]) {
  for (const part of range.split(",")) {
    const match =
      /^\s*(?:(["'])[^"']*\1\s*:\s*)?(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
    if (!match) {
      problems.push(`"{${range}}" is not a line range like {2} or {1,4-6}`);
      return;
    }
    const first = Number(match[2]);
    const last = Number(match[3] ?? match[2]);
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

function checkMarker(option: Option, lines: number, problems: string[]) {
  if (option.kind === "range") {
    checkRange(option.value, lines, problems);
  } else if (option.kind === "boolean") {
    problems.push(
      `"${option.key}" marks nothing; give lines as ${option.key}={2}, or quoted text`,
    );
  } else if (option.kind === "string" && looksUndelimited(option.value)) {
    problems.push(
      `"${option.value}" needs a space after its closing quote, / or }`,
    );
  }
}

export function checkFenceMeta(
  meta: string,
  lines: number,
  fenceLanguage: string | undefined,
  isLanguage: (lang: string) => boolean,
): string[] {
  const options = new MetaOptions(meta);
  const problems = (options.errors ?? []).map(
    (error) => `the options cannot be read: ${error}`,
  );
  for (const option of options.list()) {
    const key = (option.key ?? "").toLowerCase();
    const text = textOf(option);
    if (key === "") {
      checkMarker(option, lines, problems);
    } else if (key === "title") {
      if (option.kind !== "string" || text.trim() === "") {
        problems.push(`title needs text, as title="file.ts"`);
      } else if (looksUndelimited(text)) {
        problems.push(`"${text}" needs a space after its closing quote`);
      }
    } else if (markers.has(key)) {
      checkMarker(option, lines, problems);
    } else if (key === "frame") {
      if (!frames.has(text)) {
        problems.push(
          `frame="${text}" is none of code, terminal, none or auto`,
        );
      }
    } else if (key === "lang") {
      if (fenceLanguage !== "diff") {
        problems.push(`lang= only applies to a diff fence`);
      } else if (!isLanguage(text)) {
        problems.push(`lang="${text}" is a language Shiki does not know`);
      }
    } else if (settings.has(key)) {
      problems.push(
        `"${option.key}" is set for every block by the site, not by a fence`,
      );
    } else {
      problems.push(`"${option.key}" is no code block option`);
    }
  }
  return problems;
}
