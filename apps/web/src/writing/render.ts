import type { Element, Root, RootContent } from "hast";
import { codeToHast } from "shiki";
import { maxDiagramWidth, renderDiagrams } from "./diagrams";
import { postFile, type Post } from "./writing";

export const diagramTag = "post-diagram";

export const codeThemes = {
  light: "one-light",
  dark: "one-dark-pro",
} as const;

export const colorReplacements = {
  "one-light": {
    "#a0a1a7": "#707179",
    "#c18401": "#986801",
    "#4078f2": "#2867f0",
    "#0184bc": "#0179ad",
    "#e45649": "#d72f20",
    "#50a14f": "#3f7f3e",
  },
  "one-dark-pro": {
    "#e06c75": "#e2747d",
    "#5c6370": "#8e95a2",
    "#f44747": "#f66464",
    "#7f848e": "#91959e",
    "#be5046": "#cf7e77",
  },
};

type Block = {
  parent: Root | Element;
  index: number;
  lang: string | undefined;
  code: string;
  line: number | undefined;
};

function textOf(node: Element): string {
  return node.children
    .map((child) => {
      if (child.type === "text") {
        return child.value;
      }
      return child.type === "element" ? textOf(child) : "";
    })
    .join("");
}

function languageOf(code: Element) {
  const className = code.properties.className;
  const classes = Array.isArray(className) ? className.map(String) : [];
  return classes
    .find((name) => name.startsWith("language-"))
    ?.slice("language-".length);
}

function findBlocks(node: Root | Element, blocks: Block[]) {
  node.children.forEach((child: RootContent, index) => {
    if (child.type !== "element") {
      return;
    }
    const [code, ...rest] = child.children;
    if (
      child.tagName === "pre" &&
      code?.type === "element" &&
      code.tagName === "code" &&
      rest.length === 0
    ) {
      blocks.push({
        parent: node,
        index,
        lang: languageOf(code),
        code: textOf(code).replace(/\n$/, ""),
        line: child.position?.start.line,
      });
      return;
    }
    findBlocks(child, blocks);
  });
}

export async function highlight(code: string, lang = "text") {
  const tree = await codeToHast(code, {
    lang,
    themes: codeThemes,
    defaultColor: false,
    colorReplacements,
  });
  const [pre] = tree.children;
  if (pre?.type !== "element") {
    throw new Error(`Shiki returned no block for ${lang}`);
  }
  return pre;
}

function diagramElement(light: string, dark: string): Element {
  return {
    type: "element",
    tagName: diagramTag,
    properties: { light, dark },
    children: [],
  };
}

export async function renderBody(slug: string, body: Root): Promise<Root> {
  const tree = structuredClone(body);
  const blocks: Block[] = [];
  findBlocks(tree, blocks);
  const diagrams = blocks.filter(({ lang }) => lang === "mermaid");
  const code = blocks.filter(({ lang }) => lang !== "mermaid");
  const [rendered, highlighted] = await Promise.all([
    diagrams.length > 0
      ? renderDiagrams(diagrams.map((block) => block.code))
      : [],
    Promise.all(code.map((block) => highlight(block.code, block.lang))),
  ]);
  const problems: string[] = [];
  diagrams.forEach((block, i) => {
    const diagram = rendered[i];
    const problem =
      !diagram || "error" in diagram
        ? `the diagram did not render: ${diagram?.error ?? "no result"}`
        : diagram.width > maxDiagramWidth
          ? `the diagram is ${Math.round(diagram.width)} px wide, over ${maxDiagramWidth}, so its text would shrink to fit the column; draw it top-down (TD) or shorten its labels`
          : undefined;
    if (!diagram || "error" in diagram || problem) {
      problems.push(
        `${slug}/${postFile}: ${block.line ? `line ${block.line}: ${problem}` : problem}`,
      );
      return;
    }
    block.parent.children[block.index] = diagramElement(
      diagram.light,
      diagram.dark,
    );
  });
  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }
  code.forEach((block, i) => {
    const pre = highlighted[i];
    if (pre) {
      block.parent.children[block.index] = pre;
    }
  });
  return tree;
}

const rendered = new Map<string, Promise<Root>>();

export function renderPost(post: Post): Promise<Root> {
  let body = rendered.get(post.slug);
  if (!body) {
    body = renderBody(post.slug, post.body);
    rendered.set(post.slug, body);
  }
  return body;
}
