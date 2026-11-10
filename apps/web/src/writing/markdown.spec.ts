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

  it("renders GitHub-flavoured Markdown", () => {
    const { body, problems } = parseMarkdown("~~gone~~ and a https://x.dev\n");
    expect(problems).toEqual([]);
    const [paragraph] = elements(body.children);
    expect(
      elements(paragraph?.children ?? []).map(({ tagName }) => tagName),
    ).toEqual(["del", "a"]);
  });
});
