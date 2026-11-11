import { describe, expect, it } from "vitest";
import { checkFenceMeta } from "./fence-meta";

const known = (lang: string) => ["js", "ts"].includes(lang);

function problems(meta: string, lines = 5, lang = "js") {
  return checkFenceMeta(meta, lines, lang, known);
}

describe("checkFenceMeta", () => {
  it.each([
    "",
    'title="scripts/resume-hash.mjs"',
    "title='a.ts' {1,4}",
    "title=a.ts",
    'title="say \\"hi\\""',
    "{2} {4-5}",
    "{ 1, 3-4 }",
    'ins={"Added":2-3} del={4}',
    'ins={2} del={3} mark="a" mark=/b+/',
    '"some text" /a\\/b/',
    "frame=terminal",
    "frame=none",
  ])("takes %j", (meta) => {
    expect(problems(meta)).toEqual([]);
  });

  it("takes lang= on a diff fence", () => {
    expect(problems("lang=ts", 5, "diff")).toEqual([]);
  });

  it.each([
    ['titel="oops"', /"titel" is no code block option/],
    ["showLineNumbers", /"showLineNumbers" is no code block option/],
    ["wrap=false", /"wrap" is set for every block by the site/],
    ["preserveIndent=false", /"preserveIndent" is set for every block/],
    ["hangingIndent=2", /"hangingIndent" is set for every block/],
    ["{9}", /points past the block's last line, line 5/],
    ["{0}", /runs backwards or from 0/],
    ["{4-2}", /runs backwards or from 0/],
    ["{a}", /is not a line range/],
    ["{1}{3}", /is not a line range/],
    ["ins={6}", /points past the block's last line/],
    ['title="a.js"{2}', /needs a space after its closing quote/],
    ["mark=/(/", /the options cannot be read: .*Unterminated group/],
    ['title=""', /title needs text/],
    ["frame=window", /frame="window" is none of/],
    ["lang=ts", /lang= only applies to a diff fence/],
  ])("refuses %j", (meta, pattern) => {
    expect(problems(meta)).toEqual([expect.stringMatching(pattern)]);
  });

  it("refuses an unknown language for a diff", () => {
    expect(problems("lang=tss", 5, "diff")).toEqual([
      'lang="tss" is a language Shiki does not know',
    ]);
  });
});
