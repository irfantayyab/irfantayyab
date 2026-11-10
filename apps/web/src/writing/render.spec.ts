import type { Element, Root } from "hast";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/testing/contrast";
import { parseMarkdown } from "./markdown";
import { highlight, renderBody, renderPost } from "./render";
import type { Post } from "./writing";

const samples: Record<string, string> = {
  ts: `// A comment\nimport { a } from "b";\nexport class C<T> extends D {\n  #x = 1n;\n  m(y: T): string | null {\n    return \`\${this.#x}\` ?? /re+/g.source;\n  }\n}\n`,
  bash: `# A comment\nexport A="b" && echo "$A" | grep -E 'x' > /dev/null\nfor f in *; do cat "$f"; done\n`,
  json: `{ "a": 1, "b": [true, null, "c"] }\n`,
  yaml: `# A comment\nkey: value\nlist: [1, two]\n`,
  css: `.a > b:hover { color: #fff; margin: 0 auto !important; }\n`,
  tsx: `const A = () => <div className="x">{1}</div>;\n`,
  latex: `% A comment\n\\newcommand{\\job}[3]{#1, #2\\hfill #3\\par}\n`,
  python: `def f(x: int) -> str:\n    """Doc."""\n    return f"{x!r}"  # A comment\n`,
  diff: `- old\n+ new\n@@ -1 +1 @@\n`,
  md: `# Title\n\n*a* **b** [c](d) \`e\`\n`,
};

function styles(node: Element | Root, found: string[] = []) {
  for (const child of node.children) {
    if (child.type !== "element") {
      continue;
    }
    const style = child.properties.style;
    if (typeof style === "string") {
      found.push(style);
    }
    styles(child, found);
  }
  return found;
}

function variable(style: string, name: string) {
  return new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6,8})`).exec(style)?.[1];
}

describe("highlight", () => {
  for (const [lang, code] of Object.entries(samples)) {
    it(`colours every ${lang} token at 4.5:1 or more, in both themes`, async () => {
      const pre = await highlight(code, lang);
      const [block = "", ...tokens] = styles({ type: "root", children: [pre] });
      for (const theme of ["light", "dark"]) {
        const background = variable(block, `--shiki-${theme}-bg`);
        expect(background, `${theme} background`).toBeDefined();
        const colours = new Set(
          [block, ...tokens]
            .map((style) => variable(style, `--shiki-${theme}`))
            .filter((colour) => colour !== undefined),
        );
        expect(colours.size).toBeGreaterThan(0);
        for (const colour of colours) {
          expect(
            contrastRatio(colour, background ?? ""),
            `${theme} ${colour} on ${background}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }

  it("makes a block that can be scrolled from the keyboard", async () => {
    const pre = await highlight("x", "text");
    expect(pre.tagName).toBe("pre");
    expect(pre.properties.tabindex ?? pre.properties.tabIndex).toBe("0");
  });
});

function postWith(source: string): Post {
  return {
    slug: "a-post",
    title: "A post",
    date: "2026-11-11",
    description: "A post.",
    tags: ["ai"],
    redirectFrom: [],
    body: parseMarkdown(source).body,
    images: [],
  };
}

describe("renderPost", () => {
  it("renders a post's body once", () => {
    const post = postWith("```ts\nconst a = 1;\n```\n");
    expect(renderPost(post)).toBe(renderPost({ ...post }));
  });

  it("renders again when the post is read again, as in a dev server after a save", async () => {
    const before = postWith("Old text.\n");
    const after = postWith("New text.\n");
    expect(JSON.stringify(await renderPost(before))).toContain("Old text.");
    expect(JSON.stringify(await renderPost(after))).toContain("New text.");
  });
});

describe("renderBody", () => {
  it("highlights each fence, and leaves the post's own tree as it was", async () => {
    const { body } = parseMarkdown(
      "Some `inline` code.\n\n```ts\nconst a = 1;\n```\n\n```\nplain\n```\n",
    );
    const before = structuredClone(body);
    const rendered = await renderBody("a-post", body);
    expect(body).toEqual(before);
    const blocks = rendered.children.filter(
      (child): child is Element =>
        child.type === "element" && child.tagName === "pre",
    );
    expect(blocks).toHaveLength(2);
    for (const block of blocks) {
      expect(String(block.properties.class)).toContain("shiki");
    }
    expect(JSON.stringify(rendered)).toContain('"value":"inline"');
  });

  it("drops the fence's trailing newline", async () => {
    const { body } = parseMarkdown("```text\nline\n```\n");
    const rendered = await renderBody("a-post", body);
    expect(JSON.stringify(rendered)).not.toContain('"line\\n"');
    expect(JSON.stringify(rendered)).toContain('"value":"line"');
  });
});
