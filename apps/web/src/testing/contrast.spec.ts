import { describe, expect, it } from "vitest";
import { blend, contrastRatio } from "./contrast";

describe("blend", () => {
  it("lays a half-transparent colour over another", () => {
    expect(blend("#ffffff80", "#000000")).toBe("#808080");
  });

  it("keeps an opaque colour as it is, and ignores the one under it", () => {
    expect(blend("#123456", "#ffffff")).toBe("#123456");
    expect(blend("#123456ff", "#ffffff")).toBe("#123456");
  });

  it("shows only the colour under a transparent one", () => {
    expect(blend("#12345600", "#abcdef")).toBe("#abcdef");
  });
});

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
