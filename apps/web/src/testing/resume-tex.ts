import type { ResumeEntry, ResumeLink } from "@/resume/claims";

export type ResumeSection = {
  title: string;
  entries: ResumeEntry[];
};

export type ResumeJobLinks = {
  title: string;
  organisation: string;
  urls: string[];
};

export type ResumeTex = {
  name: string;
  headline: string;
  emails: string[];
  links: ResumeLink[];
  sections: ResumeSection[];
  jobLinks: ResumeJobLinks[];
};

const escapes: Record<string, string> = {
  "\\&": "&",
  "\\%": "%",
  "\\#": "#",
  "\\_": "_",
  "\\$": "$",
};

function unescape(tex: string): string {
  return tex.replace(/\\[&%#_$]/g, (escape) => escapes[escape] ?? escape);
}

export function texToUrl(tex: string): string {
  const url = unescape(tex).trim();
  if (/[\\{}\s]/.test(url)) {
    throw new Error(`Unsupported LaTeX in a resume link: ${tex}`);
  }
  return url;
}

export function texToText(tex: string): string {
  const text = unescape(tex)
    .replaceAll("---", "—")
    .replaceAll("--", "–")
    .replaceAll("``", "“")
    .replaceAll("''", "”")
    .replaceAll("`", "‘")
    .replaceAll("'", "’")
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

function readLinks(body: string): ResumeLink[] {
  const links: ResumeLink[] = [];
  const command = /\\bluelink(?=\{)/g;
  for (let match = command.exec(body); match; match = command.exec(body)) {
    const url = readGroup(body, match.index + match[0].length);
    const label = readGroup(body, url.end);
    links.push({ url: texToUrl(url.value), label: texToText(label.value) });
    command.lastIndex = label.end;
  }
  return links;
}

function readHrefs(tex: string): string[] {
  const urls: string[] = [];
  const command = /\\(?:href|project|bluelink)(?=\{)/g;
  for (let match = command.exec(tex); match; match = command.exec(tex)) {
    const url = readGroup(tex, match.index + match[0].length);
    urls.push(texToUrl(url.value));
    command.lastIndex = url.end;
  }
  return urls;
}

function readEmails(body: string): string[] {
  return [...body.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map(
    ([email]) => email,
  );
}

export function parseResumeTex(source: string): ResumeTex {
  const tex = stripComments(source);
  const begin = tex.indexOf("\\begin{document}");
  if (begin === -1) {
    throw new Error("No \\begin{document} in the resume");
  }
  const body = tex.slice(begin);

  const sections: ResumeSection[] = [];
  const jobs: { title: string; organisation: string; start: number }[] = [];
  const spans: { title: string; organisation: string; text: string }[] = [];
  const closeJob = (end: number) => {
    const job = jobs.pop();
    if (job) {
      spans.push({ ...job, text: body.slice(job.start, end) });
    }
  };
  const commands = /\\section\*(?=\{)|\\job(?=\{)/g;
  for (let match = commands.exec(body); match; match = commands.exec(body)) {
    closeJob(match.index);
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
      jobs.push({ title, organisation, start: end });
    } else {
      sections.push({ title: groups[0] ?? "", entries: [] });
    }
  }

  closeJob(body.length);

  return {
    name: readStyled(body, "namefont"),
    headline: readStyled(body, "headlinefont"),
    emails: readEmails(body),
    links: readLinks(body),
    sections: sections.filter((section) => section.entries.length > 0),
    jobLinks: spans.map(({ title, organisation, text }) => ({
      title,
      organisation,
      urls: readHrefs(text),
    })),
  };
}
