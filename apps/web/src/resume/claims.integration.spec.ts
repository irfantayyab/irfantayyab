import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { parseResumeTex } from "@/testing/resume-tex";
import { resume } from "./claims";
import { resumePdfPath, resumeTexPath } from "./source";

const claims = [
  resume.name,
  resume.headline,
  ...[...resume.education, ...resume.experience].flatMap(
    ({ title, organisation, dates }) =>
      [`${title}, ${organisation}`, dates].filter(Boolean),
  ),
];

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

  it("are all in the committed PDF", async () => {
    const pdf = await getDocumentProxy(
      new Uint8Array(await readFile(resumePdfPath)),
    );
    const { text } = await extractText(pdf, { mergePages: true });
    const words = text.replace(/\s+/g, " ");
    const missing = claims.filter((claim) => !words.includes(claim));
    expect(missing, "claims missing from the PDF; rebuild it").toEqual([]);
  });
});
