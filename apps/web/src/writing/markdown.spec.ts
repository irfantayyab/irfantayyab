import type { Element, RootContent } from "hast";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./markdown";

function elements(children: readonly RootContent[]): Element[] {
  return children.filter((child): child is Element => child.type === "element");
}

describe("parseMarkdown", () => {
  it("reads the front matter and leaves it out of the body", () => {
    const { matter, body, problems } = parseMarkdown(
      "---\ntitle: A post\n---\n\nText.\n",
    );
    expect(problems).toEqual([]);
    expect(matter).toEqual({ title: "A post" });
    expect(elements(body.children).map(({ tagName }) => tagName)).toEqual([
      "p",
    ]);
  });

  it("refuses a heading whose id the page already uses", () => {
    expect(parseMarkdown("Text.\n\n## Main\n").problems).toEqual([
      `line 3: the heading's id "main" is taken by the page itself, so rename the heading`,
    ]);
  });

  it("gives empty front matter when there is none", () => {
    expect(parseMarkdown("Text.\n").matter).toEqual({});
  });

  it("wraps a table in a container that scrolls on its own", () => {
    const { body } = parseMarkdown("| A | B |\n| - | - |\n| 1 | 2 |\n");
    const [wrapper] = elements(body.children);
    expect(wrapper).toMatchObject({
      tagName: "div",
      properties: { className: ["table-scroll"], tabIndex: 0 },
    });
    expect(elements(wrapper?.children ?? [])[0]?.tagName).toBe("table");
  });

  describe("callouts", () => {
    it.each([
      ["NOTE", "Note"],
      ["TIP", "Tip"],
      ["IMPORTANT", "Important"],
      ["WARNING", "Warning"],
      ["CAUTION", "Caution"],
    ])("renders [!%s] as a note labelled %s", (type, label) => {
      const { body, problems } = parseMarkdown(
        `> [!${type}]\n> Some **bold** text.\n`,
      );
      expect(problems).toEqual([]);
      const [callout] = elements(body.children);
      expect(callout).toMatchObject({
        tagName: "div",
        properties: { className: ["callout"], role: "note" },
      });
      const [first, second] = elements(callout?.children ?? []);
      expect(first).toMatchObject({
        tagName: "p",
        properties: { className: ["callout-label"] },
        children: [
          { tagName: "strong", children: [{ type: "text", value: label }] },
        ],
      });
      expect(second?.tagName).toBe("p");
      expect(second?.children[0]).toEqual(
        expect.objectContaining({ type: "text", value: "Some " }),
      );
    });

    it("keeps a callout whose text starts on a later paragraph", () => {
      const { body, problems } = parseMarkdown("> [!TIP]\n>\n> Later.\n");
      expect(problems).toEqual([]);
      const [callout] = elements(body.children);
      expect(
        elements(callout?.children ?? []).map(({ tagName }) => tagName),
      ).toEqual(["p", "p"]);
    });

    it("leaves a plain blockquote as it is", () => {
      const { body } = parseMarkdown("> Just a quote.\n");
      expect(elements(body.children)[0]?.tagName).toBe("blockquote");
    });

    it.each([
      [
        "an unknown type",
        "> [!NOTES]\n> Text.\n",
        /"\[!NOTES\]" is no callout/,
      ],
      ["a lowercase type", "> [!note]\n> Text.\n", /"\[!note\]" is no callout/],
      [
        "text on the marker's line",
        "> [!WARNING] Careful.\n",
        /line 1: put \[!WARNING\] on a line of its own/,
      ],
      ["no text", "> [!NOTE]\n", /a callout needs text/],
    ])("refuses %s", (_, source, pattern) => {
      expect(parseMarkdown(source).problems).toEqual([
        expect.stringMatching(pattern),
      ]);
    });
  });

  describe("headings", () => {
    it("links each heading's text to its own id", () => {
      const { body } = parseMarkdown("## A heading\n\n### A *sub* heading\n");
      expect(elements(body.children)).toMatchObject([
        {
          tagName: "h2",
          properties: { id: "a-heading" },
          children: [
            {
              tagName: "a",
              properties: { href: "#a-heading", className: ["heading-link"] },
              children: [{ type: "text", value: "A heading" }],
            },
          ],
        },
        {
          tagName: "h3",
          children: [{ tagName: "a", properties: { href: "#a-sub-heading" } }],
        },
      ]);
    });

    it("refuses a heading that holds a link", () => {
      expect(parseMarkdown("## See [this](https://x.dev)\n").problems).toEqual([
        "line 1: a heading links to itself, so it cannot hold a link",
      ]);
    });
  });

  describe("code fences", () => {
    it.each(["ts", "bash", "latex", "text", "mermaid"])(
      "takes a fence in %s",
      (lang) => {
        const diagram =
          lang === "mermaid" ? "accTitle: A\naccDescr: B\ngraph TD\n" : "x\n";
        expect(
          parseMarkdown(`\`\`\`${lang}\n${diagram}\`\`\`\n`).problems,
        ).toEqual([]);
      },
    );

    it("takes a fence without a language", () => {
      expect(parseMarkdown("```\nplain\n```\n").problems).toEqual([]);
    });

    it("refuses a language Shiki does not know", () => {
      expect(parseMarkdown("```typescriptt\nx\n```\n").problems).toEqual([
        `line 1: code in "typescriptt" cannot be highlighted; name a language Shiki knows, or text`,
      ]);
    });

    it("refuses a diagram without its accessible name and description", () => {
      expect(
        parseMarkdown("```mermaid\ngraph TD\n  A --> B\n```\n").problems,
      ).toEqual([
        "line 1: a diagram needs accTitle: its accessible name",
        "line 1: a diagram needs accDescr: its accessible description",
      ]);
    });

    it("takes a diagram's description as a block", () => {
      expect(
        parseMarkdown(
          "```mermaid\ngraph TD\n  accTitle: A\n  accDescr {\n    Long.\n  }\n  A --> B\n```\n",
        ).problems,
      ).toEqual([]);
    });
  });

  describe("images", () => {
    it("lists the files a post's images use", () => {
      const { images, problems } = parseMarkdown(
        "![A cat](cat.webp)\n\nText ![A dog](./a-dog.webp) here.\n",
      );
      expect(problems).toEqual([]);
      expect(images).toEqual([
        { file: "cat.webp", line: 1 },
        { file: "a-dog.webp", line: 3 },
      ]);
    });

    it("makes an image alone in its paragraph a figure, its title the caption", () => {
      const { body } = parseMarkdown('![A cat](cat.webp "A cat, asleep")\n');
      const [figure] = elements(body.children);
      expect(figure?.tagName).toBe("figure");
      const [image, caption] = elements(figure?.children ?? []);
      expect(image).toMatchObject({
        tagName: "img",
        properties: { src: "cat.webp", alt: "A cat" },
      });
      expect(image?.properties).not.toHaveProperty("title");
      expect(caption).toMatchObject({
        tagName: "figcaption",
        children: [{ type: "text", value: "A cat, asleep" }],
      });
    });

    it("gives a figure without a title no caption", () => {
      const [figure] = elements(
        parseMarkdown("![A cat](cat.webp)\n").body.children,
      );
      expect(
        elements(figure?.children ?? []).map(({ tagName }) => tagName),
      ).toEqual(["img"]);
    });

    it("leaves an image inside text in its paragraph", () => {
      const [paragraph] = elements(
        parseMarkdown("See ![A cat](cat.webp).\n").body.children,
      );
      expect(paragraph?.tagName).toBe("p");
    });

    it.each([
      ["a PNG", "![A cat](cat.png)\n", /image "cat\.png" is not a WebP file/],
      [
        "a remote image",
        "![A cat](https://x.dev/cat.webp)\n",
        /image "https:\/\/x\.dev\/cat\.webp" is not a WebP file/,
      ],
      [
        "a file in another folder",
        "![A cat](../cat.webp)\n",
        /is not a WebP file in the post's folder/,
      ],
      [
        "a name not in kebab case",
        "![A cat](Cat_1.webp)\n",
        /named in kebab case/,
      ],
      ["an image without alt text", "![](cat.webp)\n", /needs alt text/],
      [
        "an image reference",
        "![A cat][cat]\n\n[cat]: cat.webp\n",
        /write an image inline/,
      ],
    ])("refuses %s", (_, source, pattern) => {
      expect(parseMarkdown(source).problems).toEqual([
        expect.stringMatching(pattern),
      ]);
    });
  });

  it("renders GitHub-flavoured Markdown", () => {
    const { body, problems } = parseMarkdown("~~gone~~ and a https://x.dev\n");
    expect(problems).toEqual([]);
    const [paragraph] = elements(body.children);
    expect(
      elements(paragraph?.children ?? []).map(({ tagName }) => tagName),
    ).toEqual(["del", "a"]);
  });
});
