import { describe, expect, it } from "vitest";
import { diagramAnchor, isPageId } from "./page-ids";

describe("diagramAnchor", () => {
  it("numbers a post's diagrams from 1, as a reader counts them", () => {
    expect([0, 1, 9].map(diagramAnchor)).toEqual([
      "diagram-1",
      "diagram-2",
      "diagram-10",
    ]);
  });
});

describe("isPageId", () => {
  it.each([
    "main",
    "diagram-light-0",
    "diagram-dark-12",
    "diagram-light-3_x",
    "diagram-1",
    "diagram-10",
  ])("reserves %s", (id) => {
    expect(isPageId(id)).toBe(true);
  });

  it.each(["main-points", "diagram-heavy-posts", "diagram-light", "diagrams"])(
    "leaves %s to the posts",
    (id) => {
      expect(isPageId(id)).toBe(false);
    },
  );
});
