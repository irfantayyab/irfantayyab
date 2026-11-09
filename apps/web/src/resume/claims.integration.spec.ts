import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { parseResumeTex } from "@/testing/resume-tex";
import { resume } from "./claims";
import { resumeHashPath, resumePdfPath, resumeTexPath } from "./source";

const claims = [
  resume.name,
  resume.headline,
  ...[...resume.education, ...resume.experience].flatMap(
    ({ title, organisation, dates }) =>
      [`${title}, ${organisation}`, dates].filter(Boolean).join(" "),
  ),
];

function sha256(data: string | Uint8Array) {
  return createHash("sha256").update(data).digest("hex");
}

describe("the committed PDF", () => {
  it("was built from the current LaTeX source", async () => {
    const [tex, pdf, recorded] = await Promise.all([
      readFile(resumeTexPath, "utf8"),
      readFile(resumePdfPath),
      readFile(resumeHashPath, "utf8"),
    ]);
    expect(
      recorded,
      "the PDF or its source changed without a build in VS Code",
    ).toBe(
      [
        `${sha256(tex.replaceAll("\r\n", "\n"))}  ${path.basename(resumeTexPath)}`,
        `${sha256(pdf)}  ${path.basename(resumePdfPath)}`,
        "",
      ].join("\n"),
    );
  });
});

describe("the resume's claims", () => {
  it("match the resume's LaTeX source word for word", async () => {
    const tex = parseResumeTex(await readFile(resumeTexPath, "utf8"));
    expect(tex).toEqual({
      name: resume.name,
      headline: resume.headline,
      sections: [
        { title: "Education", entries: resume.education },
        { title: "Work Experience", entries: resume.experience },
      ],
    });
  });

  it("are all in the committed PDF, in order", async () => {
    const pdf = await getDocumentProxy(
      new Uint8Array(await readFile(resumePdfPath)),
    );
    const { text } = await extractText(pdf, { mergePages: true });
    const words = ` ${text.replace(/\s+/g, " ").trim()} `;
    const missing: string[] = [];
    let from = 0;
    for (const claim of claims) {
      const at = words.indexOf(` ${claim} `, from);
      if (at === -1) {
        missing.push(claim);
      } else {
        from = at + claim.length + 1;
      }
    }
    expect(missing, "claims missing from the PDF, or out of order").toEqual(
      [],
    );
  });
});
