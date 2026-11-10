import { describe, expect, it } from "vitest";
import { fixedRedirects, redirectsFile } from "./redirects";

describe("redirectsFile", () => {
  it("writes one permanent redirect per line", () => {
    expect(
      redirectsFile([
        ...fixedRedirects,
        { from: "/writing/old-name", to: "/writing/new-name" },
      ]),
    ).toBe("/home / 301\n/writing/old-name /writing/new-name 301\n");
  });

  it("writes an empty file for no redirects", () => {
    expect(redirectsFile([])).toBe("");
  });
});
