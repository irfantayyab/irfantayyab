import {
  createMermaidRenderer,
  type MermaidRenderer,
} from "mermaid-isomorphic";
import { describe, expect, it, vi } from "vitest";
import { renderDiagrams } from "./diagrams";

vi.mock("mermaid-isomorphic", () => ({ createMermaidRenderer: vi.fn() }));

const rendered: MermaidRenderer = async (diagrams) =>
  diagrams.map(() => ({
    status: "fulfilled",
    value: {
      id: "diagram-light-0",
      svg: "<svg></svg>",
      width: 100,
      height: 50,
    },
  }));

describe("renderDiagrams", () => {
  it("starts a fresh browser after one fails to launch", async () => {
    const create = vi.mocked(createMermaidRenderer);
    create
      .mockReturnValueOnce(() =>
        Promise.reject(new Error("Executable doesn't exist")),
      )
      .mockReturnValueOnce(rendered);
    await expect(renderDiagrams(["graph TD"])).rejects.toThrow(
      "Executable doesn't exist",
    );
    await expect(renderDiagrams(["graph TD"])).resolves.toEqual([
      { light: "<svg></svg>", dark: "<svg></svg>", width: 100 },
    ]);
    await renderDiagrams(["graph TD"]);
    expect(create).toHaveBeenCalledTimes(2);
  });
});
