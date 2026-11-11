import type { Element, Root, RootContent } from "hast";
import { renderCode } from "./code";
import { maxDiagramWidth, renderDiagrams } from "./diagrams";
import { postFile, type Post } from "./writing";

export const diagramTag = "post-diagram";

export const codeTag = "post-code";

type Block = {
  parent: Root | Element;
  index: number;
  lang: string | undefined;
  meta: string;
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
        meta: metaOf(code),
        code: textOf(code).replace(/\n$/, ""),
        line: child.position?.start.line,
      });
      return;
    }
    findBlocks(child, blocks);
  });
}

function metaOf(code: Element) {
  const meta = (code.data as { meta?: unknown } | undefined)?.meta;
  return typeof meta === "string" ? meta : "";
}

async function codeElement(block: Block): Promise<Element> {
  return {
    type: "element",
    tagName: codeTag,
    properties: {},
    children: await renderCode(block.code, block.lang ?? "text", block.meta),
  };
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
    Promise.all(code.map((block) => codeElement(block))),
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
    const element = highlighted[i];
    if (element) {
      block.parent.children[block.index] = element;
    }
  });
  return tree;
}

const rendered = new WeakMap<Root, Promise<Root>>();

export function renderPost(post: Post): Promise<Root> {
  let body = rendered.get(post.body);
  if (!body) {
    body = renderBody(post.slug, post.body).catch((error: unknown) => {
      rendered.delete(post.body);
      throw error;
    });
    rendered.set(post.body, body);
  }
  return body;
}
