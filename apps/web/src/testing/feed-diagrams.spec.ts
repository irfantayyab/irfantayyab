import { describe, expect, it } from "vitest";
import { feedDiagramLinks } from "./feed-diagrams";

describe("feedDiagramLinks", () => {
  it("pairs each diagram's title in a feed body with its link, in order", () => {
    const html = [
      '<p><strong>One</strong></p><p>First.</p><p><a href="https://a.dev/p#diagram-1">The diagram is on the site.</a></p>',
      "<p>Text between.</p>",
      '<p><strong>Two</strong></p><p>Second.</p><p><a href="https://a.dev/p#diagram-2">The diagram is on the site.</a></p>',
    ].join("");
    expect(feedDiagramLinks(html)).toEqual([
      { title: "One", href: "https://a.dev/p#diagram-1" },
      { title: "Two", href: "https://a.dev/p#diagram-2" },
    ]);
  });

  it("finds nothing in a body without diagrams", () => {
    expect(feedDiagramLinks("<p><strong>Bold</strong> text.</p>")).toEqual([]);
  });
});
