import { describe, expect, it } from "vitest";
import { checkFenceMeta } from "./fence-meta";

const known = (lang: string) => ["js", "ts"].includes(lang);

function problems(meta: string, lines = 5) {
  return checkFenceMeta(meta, lines, known);
}

describe("checkFenceMeta", () => {
  it.each([
    "",
    'title="scripts/resume-hash.mjs"',
    "title='a.ts' {1,4}",
    "title=a.ts",
    "{2} {4-5}",
    "{ 1, 3-4 }",
    'ins={2} del={3} mark="a" mark=/b+/',
    '"some text" /a\\/b/',
    "frame=terminal",
    "frame=none wrap=false preserveIndent=true hangingIndent=2",
    "lang=ts",
  ])("takes %j", (meta) => {
    expect(problems(meta)).toEqual([]);
  });

  it.each([
    ['titel="oops"', /"titel=" is no code block option/],
    ["showLineNumbers", /"showLineNumbers" is no code block option/],
    ["{9}", /points past the block's last line, line 5/],
    ["{0}", /runs backwards or from 0/],
    ["{4-2}", /runs backwards or from 0/],
    ["{a}", /is not a line range/],
    ["ins={6}", /points past the block's last line/],
    ["mark=a", /"a" marks nothing/],
    ['title=""', /title needs text/],
    ["frame=window", /frame="window" is none of/],
    ["wrap=yes", /wrap="yes" is neither true nor false/],
    ["hangingIndent=two", /hangingIndent="two" is not a whole number/],
    ["lang=tss", /lang="tss" is a language Shiki does not know/],
    ['title="open', /unclosed quote/],
    ["{1", /unclosed/],
  ])("refuses %j", (meta, pattern) => {
    expect(problems(meta)).toEqual([expect.stringMatching(pattern)]);
  });
});
