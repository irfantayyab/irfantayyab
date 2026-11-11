import { describe, expect, it } from "vitest";
import { isPageId } from "./page-ids";

describe("isPageId", () => {
  it.each(["main", "diagram-light-0", "diagram-dark-12", "diagram-light-3_x"])(
    "reserves %s",
    (id) => {
      expect(isPageId(id)).toBe(true);
    },
  );

  it.each(["main-points", "diagram-heavy-posts", "diagram-light", "diagrams"])(
    "leaves %s to the posts",
    (id) => {
      expect(isPageId(id)).toBe(false);
    },
  );
});
