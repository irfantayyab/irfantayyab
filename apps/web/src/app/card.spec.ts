import { describe, expect, it } from "vitest";
import { fitTitle, titleSize, unprintable } from "./card";

describe("fitTitle", () => {
  it("keeps a title that fits", () => {
    expect(fitTitle("Holding a portfolio to its resume")).toBe(
      "Holding a portfolio to its resume",
    );
  });

  it("cuts a long title at a word, without trailing punctuation, and ends it with an ellipsis", () => {
    const title = `${"a ".repeat(50)}end, ${"b".repeat(20)}`;
    const fitted = fitTitle(title);
    expect(fitted.length).toBeLessThanOrEqual(111);
    expect(fitted).toMatch(/ end…$/);
    expect(title.startsWith(fitted.slice(0, -1))).toBe(true);
  });

  it("cuts a single word that is too long", () => {
    expect(fitTitle("a".repeat(200))).toBe(`${"a".repeat(110)}…`);
  });
});

describe("titleSize", () => {
  it("steps down as a title gets longer", () => {
    const sizes = [10, 50, 100].map((length) => titleSize("a".repeat(length)));
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(new Set(sizes).size).toBe(3);
  });
});

describe("unprintable", () => {
  const glyphs = new Set([..."Café "].map((char) => char.codePointAt(0) ?? -1));

  it("passes text whose every character the font draws", () => {
    expect(unprintable("Café Café", glyphs)).toEqual([]);
  });

  it("names each character the font cannot draw, once", () => {
    expect(unprintable("Café → Café →", glyphs)).toEqual(["→"]);
  });
});
