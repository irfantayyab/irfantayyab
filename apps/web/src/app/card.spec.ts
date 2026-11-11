import { describe, expect, it } from "vitest";
import { fitTitle, renderCard, titleSize, unprintable } from "./card";

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
  it("passes the Latin text and punctuation a title uses", () => {
    expect(
      unprintable("Café, naïve — “quoted” · 10 € – Łódź → Next.js™"),
    ).toEqual([]);
  });

  it("names the characters Newsreader has no glyph for", () => {
    expect(unprintable("Hello 世界 🚀")).toEqual(["世", "界", "🚀"]);
  });
});

describe("renderCard", () => {
  it("refuses text the card cannot draw, before it would fetch a font", async () => {
    await expect(
      renderCard({ title: "Hello 世界", subtitle: "", footer: "" }),
    ).rejects.toThrow(/"世", "界"/);
  });
});
