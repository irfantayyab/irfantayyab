import type { Element } from "hast";
import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./markdown";
import { diagramTag, renderBody } from "./render";

const hasBrowser = await chromium.launch().then(
  async (browser) => {
    await browser.close();
    return true;
  },
  () => false,
);

const diagram = [
  "```mermaid",
  "flowchart LR",
  "  accTitle: Source to page",
  "  accDescr: The post's source becomes a page.",
  "  source[index.md] --> page[The page]",
  "```",
  "",
].join("\n");

describe.skipIf(!hasBrowser)("renderBody with diagrams", () => {
  it("renders each diagram for both themes, with its name and description", async () => {
    const { body, problems } = parseMarkdown(`Text.\n\n${diagram}`);
    expect(problems).toEqual([]);
    const rendered = await renderBody("a-post", body);
    const element = rendered.children.find(
      (child): child is Element =>
        child.type === "element" && child.tagName === diagramTag,
    );
    const { light, dark } = element?.properties ?? {};
    for (const [scheme, svg] of [
      ["light", light],
      ["dark", dark],
    ] as const) {
      expect(typeof svg).toBe("string");
      const markup = String(svg);
      expect(markup).toMatch(new RegExp(`^<svg[^>]* id="diagram-${scheme}-0"`));
      expect(markup).toContain("Source to page");
      expect(markup).toContain("The post's source becomes a page.");
      expect(markup).toContain("Newsreader Variable");
      expect(markup).not.toContain("<foreignObject");
    }
    expect(light).not.toEqual(dark);
  });

  it("fails a diagram too wide for the column", async () => {
    const steps = Array.from(
      { length: 8 },
      (_, i) => `  s${i}[A rather long step label] --> s${i + 1}`,
    );
    const { body } = parseMarkdown(
      `Text.\n\n\`\`\`mermaid\nflowchart LR\n  accTitle: A\n  accDescr: B\n${steps.join("\n")}\n\`\`\`\n`,
    );
    await expect(renderBody("a-post", body)).rejects.toThrow(
      /a-post\/index\.md: line 3: the diagram is \d+ px wide, over 800/,
    );
  });

  it("fails a diagram that does not render, naming the post and line", async () => {
    const { body } = parseMarkdown(
      "Text.\n\n```mermaid\naccTitle: A\naccDescr: B\nnot a diagram\n```\n",
    );
    await expect(renderBody("a-post", body)).rejects.toThrow(
      /a-post\/index\.md: line 3: the diagram did not render/,
    );
  });
});
