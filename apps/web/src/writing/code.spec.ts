import type { Element, ElementContent } from "hast";
import { describe, expect, it } from "vitest";
import { blend, contrastRatio } from "@/testing/contrast";
import {
  codeBackgrounds,
  codeStyles,
  hangingIndent,
  minContrast,
  renderCode,
  tabWidth,
} from "./code";

const samples: Record<string, string> = {
  ts: `// A comment\nimport { a } from "b";\nexport class C<T> extends D {\n  #x = 1n;\n  m(y: T): string | null {\n    return \`\${this.#x}\` ?? /re+/g.source;\n  }\n}`,
  bash: `# A comment\nexport A="b" && echo "$A" | grep -E 'x' > /dev/null\nfor f in *; do cat "$f"; done`,
  json: `{ "a": 1, "b": [true, null, "c"] }`,
  yaml: `# A comment\nkey: value\nlist: [1, two]`,
  css: `.a > b:hover { color: #fff; margin: 0 auto !important; }`,
  tsx: `const A = () => <div className="x">{1}</div>;`,
  latex: `% A comment\n\\newcommand{\\job}[3]{#1, #2\\hfill #3\\par}`,
  python: `def f(x: int) -> str:\n    """Doc."""\n    return f"{x!r}"  # A comment`,
  diff: `- old\n+ new\n@@ -1 +1 @@`,
  md: `# Title\n\n*a* **b** [c](d) \`e\``,
};

function elementsIn(nodes: readonly ElementContent[]): Element[] {
  return nodes.flatMap((node) =>
    node.type === "element" ? [node, ...elementsIn(node.children)] : [],
  );
}

function styleOf(element: Element) {
  const style = element.properties.style;
  return typeof style === "string" ? style : "";
}

function colours(nodes: readonly ElementContent[], variable: string) {
  const pattern = new RegExp(`${variable}:(#[0-9a-fA-F]{6,8})(?:;|$)`);
  return new Set(
    elementsIn(nodes)
      .map((element) => pattern.exec(styleOf(element))?.[1])
      .filter((colour) => colour !== undefined),
  );
}

function classesOf(element: Element) {
  const className = element.properties.className;
  return Array.isArray(className) ? className.map(String) : [];
}

describe("renderCode", () => {
  for (const [lang, code] of Object.entries(samples)) {
    it(`colours every ${lang} token at 4.5:1 or more, in both themes`, async () => {
      const nodes = await renderCode(code, lang, "");
      const backgrounds = await codeBackgrounds();
      for (const [variable, theme] of [
        ["--0", "dark"],
        ["--1", "light"],
      ] as const) {
        const found = colours(nodes, variable);
        expect(found.size, `${theme} colours`).toBeGreaterThan(0);
        for (const colour of found) {
          expect(
            contrastRatio(colour, backgrounds[theme]),
            `${theme} ${colour} on ${backgrounds[theme]}`,
          ).toBeGreaterThanOrEqual(minContrast);
        }
      }
    });
  }

  for (const [marker, meta] of [
    ["mark", "{1-8}"],
    ["ins", "ins={1-8}"],
    ["del", "del={1-8}"],
  ] as const) {
    it(`keeps every token at 4.5:1 or more on ${marker} lines, in both themes`, async () => {
      const css = await codeStyles();
      const backgrounds = await codeBackgrounds();
      const tints = [
        ...css.matchAll(
          new RegExp(`--ec-tm-${marker}Bg:(#[0-9a-fA-F]{6,8})`, "g"),
        ),
      ].map((match) => match[1] ?? "");
      expect(tints, `the ${marker} tint in each theme`).toHaveLength(2);
      const nodes = await renderCode(samples.ts ?? "", "ts", meta);
      const lines = elementsIn(nodes).filter((element) =>
        classesOf(element).includes(marker),
      );
      expect(lines.length).toBe(8);
      for (const [index, [variable, theme]] of (
        [
          ["--0", "dark"],
          ["--1", "light"],
        ] as const
      ).entries()) {
        const background = blend(tints[index] ?? "", backgrounds[theme]);
        const found = colours(lines, variable);
        expect(
          found.size,
          `${theme} colours on ${marker} lines`,
        ).toBeGreaterThan(5);
        for (const colour of found) {
          expect(
            contrastRatio(colour, background),
            `${theme} ${colour} on a ${marker} line (${background})`,
          ).toBeGreaterThanOrEqual(minContrast);
        }
      }
    });
  }

  function indents(nodes: readonly ElementContent[]) {
    return elementsIn(nodes)
      .filter((element) => classesOf(element).includes("ec-line"))
      .map((line) => Number(/--ecIndent:(\d+)ch/.exec(styleOf(line))?.[1]));
  }

  it("indents each line's continuation deeper than the line, by the hanging indent", async () => {
    const nodes = await renderCode("if (a) {\n  b();\n    c();\n}", "ts", "");
    expect(indents(nodes)).toEqual(
      [0, 2, 4, 0].map((indent) => indent + hangingIndent),
    );
  });

  it("counts a tab as wide as the browser draws it", async () => {
    const nodes = await renderCode("a:\n\tb\n\t\tc\n \td", "makefile", "");
    expect(indents(nodes)).toEqual(
      [0, tabWidth, 2 * tabWidth, tabWidth + 1].map(
        (indent) => indent + hangingIndent,
      ),
    );
  });

  it("makes each block a named group reachable from the keyboard, since it may scroll", async () => {
    const pre = elementsIn(await renderCode("x", "text", "")).find(
      (element) => element.tagName === "pre",
    );
    expect(pre?.properties).toMatchObject({
      tabIndex: 0,
      role: "group",
      ariaLabel: "Code",
    });
    const titled = elementsIn(await renderCode("x", "js", 'title="a.js"')).find(
      (element) => element.tagName === "pre",
    );
    expect(titled?.properties.ariaLabel).toBe("Code: a.js");
  });

  it.each([
    ["// src/app/page.tsx\nexport default 1;", "tsx"],
    ["# deploy.sh\necho hi", "bash"],
  ])(
    "keeps a first-line file name in the code, as written: %j",
    async (code, lang) => {
      const nodes = elementsIn(await renderCode(code, lang, ""));
      expect(
        nodes.filter((element) => classesOf(element).includes("ec-line")),
      ).toHaveLength(2);
      const title = nodes.find((element) =>
        classesOf(element).includes("title"),
      );
      expect(
        (title?.children ?? [])
          .map((child) => (child.type === "text" ? child.value : ""))
          .join(""),
      ).toBe("");
    },
  );

  it("gives a block its title, and a shell block a terminal frame", async () => {
    const titled = elementsIn(
      await renderCode("const a = 1;", "js", 'title="a.js"'),
    );
    expect(
      titled.find((element) => classesOf(element).includes("title")),
    ).toMatchObject({ children: [{ type: "text", value: "a.js" }] });
    const terminal = elementsIn(await renderCode("echo hi", "bash", ""));
    expect(
      terminal.some((element) => classesOf(element).includes("is-terminal")),
    ).toBe(true);
  });

  it("marks the lines a fence asks for", async () => {
    const lines = elementsIn(
      await renderCode("a();\nb();\nc();", "js", "{2}"),
    ).filter((element) => classesOf(element).includes("ec-line"));
    expect(lines.map((line) => classesOf(line).includes("mark"))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("has no copy button of its own, since the page brings one", async () => {
    const nodes = await renderCode("const a = 1;", "js", "");
    expect(
      elementsIn(nodes).some((element) => classesOf(element).includes("copy")),
    ).toBe(false);
  });
});

describe("codeStyles", () => {
  it("switches between the two themes with the device, with no page class", async () => {
    const css = await codeStyles();
    expect(css).toContain("@media (prefers-color-scheme: light)");
    expect(css).not.toMatch(/\[data-theme/);
  });
});
