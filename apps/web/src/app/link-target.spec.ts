import { describe, expect, it } from "vitest";
import { linkTarget } from "./link-target";

describe("linkTarget", () => {
  it("opens an address on another site in a new tab", () => {
    expect(linkTarget("https://github.com/irfantayyab")).toEqual({
      target: "_blank",
      rel: "noopener",
    });
    expect(linkTarget("HTTP://example.com")).toEqual({
      target: "_blank",
      rel: "noopener",
    });
  });

  it("keeps the site's own paths, anchors and mail links in the same tab", () => {
    for (const href of [
      "/writing",
      "/resume.pdf",
      "#main",
      "mailto:hello@irfantayyab.com",
    ]) {
      expect(linkTarget(href)).toEqual({});
    }
  });
});
