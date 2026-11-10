import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white, either way round", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  it("is 1 for a colour on itself", () => {
    expect(contrastRatio("#6b6a65", "#6b6a65")).toBe(1);
  });

  it("matches a known pair", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });

  it("ignores an alpha channel and refuses other forms", () => {
    expect(contrastRatio("#000000ff", "#ffffff")).toBeCloseTo(21, 5);
    expect(() => contrastRatio("black", "#ffffff")).toThrow(/rrggbb/);
  });
});
