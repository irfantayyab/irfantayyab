import type { Element, Root, RootContent } from "hast";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { VFile } from "vfile";
import { matter } from "vfile-matter";

type MarkdownNode = {
  type: string;
  depth?: number;
  position?: { start: { line: number } };
  children?: MarkdownNode[];
};

export type ParsedMarkdown = {
  matter: unknown;
  body: Root;
  problems: string[];
};

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug);

function unsupported(node: MarkdownNode) {
  switch (node.type) {
    case "html":
      return "raw HTML is not rendered, so a post reads the same anywhere";
    case "image":
    case "imageReference":
      return "images come with M6";
    case "heading":
      return node.depth === 1
        ? "the title is the page's only level-1 heading, so the body starts at ##"
        : undefined;
    default:
      return undefined;
  }
}

function check(node: MarkdownNode, problems: string[]) {
  const problem = unsupported(node);
  if (problem) {
    const line = node.position?.start.line;
    problems.push(line ? `line ${line}: ${problem}` : problem);
  }
  for (const child of node.children ?? []) {
    check(child, problems);
  }
}

function scrollTables<T extends Root | Element>(node: T): T {
  node.children = node.children.map((child: RootContent) => {
    if (child.type !== "element") {
      return child;
    }
    if (child.tagName === "table") {
      return {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"], tabIndex: 0 },
        children: [scrollTables(child)],
      };
    }
    return scrollTables(child);
  }) as T["children"];
  return node;
}

export function parseMarkdown(source: string): ParsedMarkdown {
  const file = new VFile({ value: source });
  const problems: string[] = [];
  try {
    matter(file);
  } catch (error) {
    problems.push(
      `front matter is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const tree = processor.parse(file);
  check(tree, problems);
  const body = scrollTables(processor.runSync(tree, file));
  return { matter: file.data.matter ?? {}, body, problems };
}
