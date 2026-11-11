import { describe, expect, it } from "vitest";
import { projectScreenshots } from "./project-screenshots";
import { projects } from "./projects";

describe("the projects' screenshots", () => {
  it("each belong to a project", () => {
    const names = projects.map(({ name }) => name);
    expect(
      Object.keys(projectScreenshots).filter((name) => !names.includes(name)),
    ).toEqual([]);
  });

  it("each have alt text", () => {
    for (const { alt } of Object.values(projectScreenshots)) {
      expect(alt).toMatch(/\S/);
    }
  });
});
