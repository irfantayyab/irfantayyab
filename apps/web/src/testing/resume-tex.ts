import type { ResumeEntry } from "@/resume/claims";

export type ResumeSection = {
  title: string;
  entries: ResumeEntry[];
};

export type ResumeTex = {
  name: string;
  headline: string;
  sections: ResumeSection[];
};

const escapes: Record<string, string> = {
  "\\&": "&",
  "\\%": "%",
  "\\#": "#",
  "\\_": "_",
  "\\$": "$",
};

export function texToText(tex: string): string {
  const text = tex
    .replace(/\\[&%#_$]/g, (escape) => escapes[escape] ?? escape)
    .replaceAll("---", "—")
    .replaceAll("--", "–")
    .replaceAll("~", " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/[\\{}]/.test(text)) {
    throw new Error(`Unsupported LaTeX in a resume claim: ${tex}`);
  }
  return text;
}

function stripComments(tex: string): string {
  return tex
    .split("\n")
    .map((line) => line.replace(/(?<!\\)%.*$/, ""))
    .join("\n");
}

function readGroup(tex: string, start: number): { value: string; end: number } {
  if (tex[start] !== "{") {
    throw new Error(`Expected "{" at ${start} of the resume`);
  }
  let depth = 0;
  for (let index = start; index < tex.length; index++) {
    const char = tex[index];
    if (char === "\\") {
      index++;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return { value: tex.slice(start + 1, index), end: index + 1 };
      }
    }
  }
  throw new Error(`Unclosed "{" at ${start} of the resume`);
}

function readStyled(body: string, font: string): string {
  const match = new RegExp(`\\{\\\\${font}\\s+([^{}]*?)\\\\par\\}`).exec(body);
  if (!match?.[1]) {
    throw new Error(`No {\\${font} …\\par} in the resume`);
  }
  return texToText(match[1]);
}

export function parseResumeTex(source: string): ResumeTex {
  const tex = stripComments(source);
  const begin = tex.indexOf("\\begin{document}");
  if (begin === -1) {
    throw new Error("No \\begin{document} in the resume");
  }
  const body = tex.slice(begin);

  const sections: ResumeSection[] = [];
  const commands = /\\section\*(?=\{)|\\job(?=\{)/g;
  for (let match = commands.exec(body); match; match = commands.exec(body)) {
    let end = match.index + match[0].length;
    const groups: string[] = [];
    const count = match[0] === "\\job" ? 3 : 1;
    while (groups.length < count) {
      const group = readGroup(body, end);
      groups.push(texToText(group.value));
      end = group.end;
    }
    commands.lastIndex = end;

    if (match[0] === "\\job") {
      const [title = "", organisation = "", dates = ""] = groups;
      const section = sections.at(-1);
      if (!section) {
        throw new Error(`\\job{${title}} comes before any \\section*`);
      }
      section.entries.push({ title, organisation, dates });
    } else {
      sections.push({ title: groups[0] ?? "", entries: [] });
    }
  }

  return {
    name: readStyled(body, "namefont"),
    headline: readStyled(body, "headlinefont"),
    sections: sections.filter((section) => section.entries.length > 0),
  };
}
