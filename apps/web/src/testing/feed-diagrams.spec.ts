import { describe, expect, it } from "vitest";
import { feedDiagramImages } from "./feed-diagrams";

describe("feedDiagramImages", () => {
  it("pairs each diagram's image in a feed body with its alt text and description, in order", () => {
    const html = [
      '<p><img src="https://a.dev/writing/p/diagram-1.png" alt="One"></p><p>First.</p>',
      "<p>Text between.</p>",
      '<p><img src="https://a.dev/writing/p/diagram-2.png" alt="Two"></p><p>Second.</p>',
    ].join("");
    expect(feedDiagramImages(html)).toEqual([
      {
        src: "https://a.dev/writing/p/diagram-1.png",
        alt: "One",
        description: "First.",
      },
      {
        src: "https://a.dev/writing/p/diagram-2.png",
        alt: "Two",
        description: "Second.",
      },
    ]);
  });

  it("finds nothing in a body without diagrams", () => {
    expect(feedDiagramImages("<p><strong>Bold</strong> text.</p>")).toEqual([]);
  });
});
