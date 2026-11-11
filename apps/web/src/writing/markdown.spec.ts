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

  it("refuses a heading whose id a diagram uses", () => {
    expect(parseMarkdown("Text.\n\n## Diagram light 0\n").problems).toEqual([
      `line 3: the heading's id "diagram-light-0" is taken by the page itself, so rename the heading`,
    ]);
  });

  it("refuses a second heading that slugs to a diagram's anchor", () => {
    expect(
      parseMarkdown("Text.\n\n## Diagram\n\n## Diagram\n").problems,
    ).toEqual([
      `line 5: the heading's id "diagram-1" is taken by the page itself, so rename the heading`,
    ]);
  });

  it("leaves a heading that only starts like a diagram's anchor", () => {
    expect(
      parseMarkdown("Text.\n\n## Diagram 2: the build\n").problems,
    ).toEqual([]);
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

    it.each([
      ["lowercase", "> [!note]\n> Text.\n"],
      ["mixed case", "> [!Warning]\n> Text.\n"],
      ["CRLF line endings", "> [!NOTE]\r\n> Text.\r\n"],
    ])("takes a marker in %s, as GitHub does", (_, source) => {
      const { body, problems } = parseMarkdown(source);
      expect(problems).toEqual([]);
      const [callout] = elements(body.children);
      expect(callout?.properties.role).toBe("note");
      const [, text] = elements(callout?.children ?? []);
      expect(text?.children[0]).toEqual(
        expect.objectContaining({ type: "text", value: "Text." }),
      );
    });

    it("drops the line break of a marker that ends in two spaces", () => {
      const { body, problems } = parseMarkdown("> [!NOTE]  \n> Text.\n");
      expect(problems).toEqual([]);
      const [, text] = elements(elements(body.children)[0]?.children ?? []);
      expect(text?.children).toEqual([
        expect.objectContaining({ type: "text", value: "Text." }),
      ]);
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
      [
        "a callout inside a list",
        "- > [!NOTE]\n  > Text.\n",
        /line 1: GitHub renders \[!NOTE\] only in a quote at the top level/,
      ],
      [
        "a callout inside another quote",
        "> > [!NOTE]\n> > Text.\n",
        /line 1: GitHub renders \[!NOTE\] only in a quote at the top level/,
      ],
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

    it("leaves the hidden footnotes heading unlinked", () => {
      const { body, problems } = parseMarkdown("A[^1].\n\n[^1]: Note.\n");
      expect(problems).toEqual([]);
      const section = elements(body.children).find(
        ({ tagName }) => tagName === "section",
      );
      const [heading] = elements(section?.children ?? []);
      expect(heading).toMatchObject({
        tagName: "h2",
        properties: { id: "footnote-label", className: ["sr-only"] },
      });
      expect(elements(heading?.children ?? [])).toEqual([]);
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

    it("takes a fence's options and refuses a mistaken one, naming its line", () => {
      expect(
        parseMarkdown('Text.\n\n```js title="a.js" {2}\na();\nb();\n```\n')
          .problems,
      ).toEqual([]);
      expect(
        parseMarkdown('Text.\n\n```js titel="a.js"\na();\n```\n').problems,
      ).toEqual(['line 3: "titel" is no code block option']);
      expect(
        parseMarkdown("Text.\n\n```js {3}\na();\nb();\n```\n").problems,
      ).toEqual(['line 3: "{3}" points past the block\'s last line, line 2']);
    });

    it("refuses options on a diagram", () => {
      expect(
        parseMarkdown(
          '```mermaid title="x"\naccTitle: A\naccDescr: B\ngraph TD\n```\n',
        ).problems,
      ).toEqual(["line 1: a diagram takes no options after mermaid"]);
    });

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
