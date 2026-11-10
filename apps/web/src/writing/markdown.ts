import type { Element, ElementContent, Root, RootContent } from "hast";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { bundledLanguages } from "shiki";
import { unified } from "unified";
import { VFile } from "vfile";
import { matter } from "vfile-matter";
import { pageIds } from "@/app/page-ids";
import { imageFile, plainLanguages } from "./schema";

type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  lang?: string | null;
  url?: string;
  alt?: string | null;
  position?: { start: { line: number } };
  data?: Record<string, unknown>;
  children?: MarkdownNode[];
};

export type ImageReference = {
  file: string;
  line?: number;
};

export type ParsedMarkdown = {
  matter: unknown;
  body: Root;
  images: ImageReference[];
  problems: string[];
};

type Context = {
  images: ImageReference[];
  problems: string[];
};

export const calloutLabels = {
  NOTE: "Note",
  TIP: "Tip",
  IMPORTANT: "Important",
  WARNING: "Warning",
  CAUTION: "Caution",
} as const;

const calloutMarker = /^\[!([^\]\s]*)\]/;
const headingTags = new Set(["h2", "h3", "h4", "h5", "h6"]);

const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug);

function report(problems: string[], line: number | undefined, problem: string) {
  problems.push(line ? `line ${line}: ${problem}` : problem);
}

export function isCodeLanguage(lang: string) {
  return Object.hasOwn(bundledLanguages, lang) || plainLanguages.has(lang);
}

function checkImage(node: MarkdownNode, context: Context) {
  const line = node.position?.start.line;
  const file = (node.url ?? "").replace(/^\.\//, "");
  if (imageFile.test(file)) {
    context.images.push({ file, line });
  } else {
    report(
      context.problems,
      line,
      `image "${node.url}" is not a WebP file in the post's folder, named in kebab case`,
    );
  }
  if (!node.alt?.trim()) {
    report(
      context.problems,
      line,
      "an image needs alt text, saying what it shows",
    );
  }
}

function checkFence(node: MarkdownNode, context: Context) {
  const line = node.position?.start.line;
  const lang = node.lang ?? undefined;
  if (lang === "mermaid") {
    const source = node.value ?? "";
    if (!/^\s*accTitle\s*:\s*\S/m.test(source)) {
      report(
        context.problems,
        line,
        "a diagram needs accTitle: its accessible name",
      );
    }
    if (!/^\s*accDescr\s*(?::\s*\S|\{)/m.test(source)) {
      report(
        context.problems,
        line,
        "a diagram needs accDescr: its accessible description",
      );
    }
  } else if (lang !== undefined && !isCodeLanguage(lang)) {
    report(
      context.problems,
      line,
      `code in "${lang}" cannot be highlighted; name a language Shiki knows, or text`,
    );
  }
}

function makeCallout(node: MarkdownNode, topLevel: boolean, context: Context) {
  const first = node.children?.[0];
  const text = first?.type === "paragraph" ? first.children?.[0] : undefined;
  const match =
    text?.type === "text" ? calloutMarker.exec(text.value ?? "") : null;
  if (!first?.children || !text || !match) {
    return;
  }
  const line = node.position?.start.line;
  const marker = match[0];
  if (!topLevel) {
    report(
      context.problems,
      line,
      `GitHub renders ${marker} only in a quote at the top level, not inside a list or another quote`,
    );
    return;
  }
  const type = (match[1] ?? "").toUpperCase();
  if (!Object.hasOwn(calloutLabels, type)) {
    report(
      context.problems,
      line,
      `"${marker}" is no callout; use [!NOTE], [!TIP], [!IMPORTANT], [!WARNING] or [!CAUTION]`,
    );
    return;
  }
  const rest = (text.value ?? "").slice(marker.length);
  if (rest !== "" && !/^\r?\n/.test(rest)) {
    report(
      context.problems,
      line,
      `put ${marker} on a line of its own, as GitHub needs`,
    );
    return;
  }
  text.value = rest.replace(/^\r?\n/, "");
  if (text.value === "") {
    first.children.shift();
    if (first.children[0]?.type === "break") {
      first.children.shift();
    }
  }
  const children = node.children ?? [];
  if (first.children.length === 0) {
    children.shift();
  }
  if (children.length === 0) {
    report(
      context.problems,
      line,
      "a callout needs text under its [!TYPE] line",
    );
    return;
  }
  node.data = {
    hName: "div",
    hProperties: { className: ["callout"], role: "note" },
  };
  children.unshift({
    type: "paragraph",
    data: { hProperties: { className: ["callout-label"] } },
    children: [
      {
        type: "strong",
        children: [
          {
            type: "text",
            value: calloutLabels[type as keyof typeof calloutLabels],
          },
        ],
      },
    ],
  });
}

function check(node: MarkdownNode, context: Context, parent?: MarkdownNode) {
  const line = node.position?.start.line;
  switch (node.type) {
    case "html":
      report(
        context.problems,
        line,
        "raw HTML is not rendered, so a post reads the same anywhere",
      );
      break;
    case "imageReference":
      report(
        context.problems,
        line,
        "write an image inline, as ![alt](file.webp), not as a reference",
      );
      break;
    case "image":
      checkImage(node, context);
      break;
    case "code":
      checkFence(node, context);
      break;
    case "blockquote":
      makeCallout(node, parent?.type === "root", context);
      break;
    case "heading":
      if (node.depth === 1) {
        report(
          context.problems,
          line,
          "the title is the page's only level-1 heading, so the body starts at ##",
        );
      }
      break;
  }
  for (const child of node.children ?? []) {
    check(child, context, node);
  }
}

function elements(children: readonly RootContent[]): Element[] {
  return children.filter((child): child is Element => child.type === "element");
}

function holdsLink(node: Element): boolean {
  return elements(node.children).some(
    (child) => child.tagName === "a" || holdsLink(child),
  );
}

function linkHeading(heading: Element, problems: string[]) {
  const id = heading.properties.id;
  const className = heading.properties.className;
  const hidden = Array.isArray(className) && className.includes("sr-only");
  if (typeof id !== "string" || hidden) {
    return;
  }
  const line = heading.position?.start.line;
  if (pageIds.has(id)) {
    report(
      problems,
      line,
      `the heading's id "${id}" is taken by the page itself, so rename the heading`,
    );
  }
  if (holdsLink(heading)) {
    report(
      problems,
      line,
      "a heading links to itself, so it cannot hold a link",
    );
    return;
  }
  heading.children = [
    {
      type: "element",
      tagName: "a",
      properties: { href: `#${id}`, className: ["heading-link"] },
      children: heading.children,
    },
  ];
}

function figure(paragraph: Element): Element | undefined {
  const [image, ...others] = elements(paragraph.children);
  const onlyImage =
    image?.tagName === "img" &&
    others.length === 0 &&
    paragraph.children.every(
      (child) =>
        child === image || (child.type === "text" && child.value.trim() === ""),
    );
  if (!onlyImage) {
    return undefined;
  }
  const { title, ...properties } = image.properties;
  const children: ElementContent[] = [{ ...image, properties }];
  if (typeof title === "string" && title.trim() !== "") {
    children.push({
      type: "element",
      tagName: "figcaption",
      properties: {},
      children: [{ type: "text", value: title }],
    });
  }
  return {
    type: "element",
    tagName: "figure",
    properties: {},
    position: paragraph.position,
    children,
  };
}

function shape<T extends Root | Element>(node: T, problems: string[]): T {
  node.children = node.children.map((child: RootContent) => {
    if (child.type !== "element") {
      return child;
    }
    if (headingTags.has(child.tagName)) {
      linkHeading(child, problems);
      return child;
    }
    if (child.tagName === "table") {
      return {
        type: "element",
        tagName: "div",
        properties: { className: ["table-scroll"], tabIndex: 0 },
        children: [shape(child, problems)],
      };
    }
    if (child.tagName === "p") {
      const asFigure = figure(child);
      if (asFigure) {
        return asFigure;
      }
    }
    return shape(child, problems);
  }) as T["children"];
  return node;
}

export function parseMarkdown(source: string): ParsedMarkdown {
  const file = new VFile({ value: source });
  const context: Context = { images: [], problems: [] };
  try {
    matter(file);
  } catch (error) {
    context.problems.push(
      `front matter is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const tree = processor.parse(file);
  check(tree as MarkdownNode, context);
  const html = processor.runSync(tree, file);
  const body = shape(html, context.problems);
  return {
    matter: file.data.matter ?? {},
    body,
    images: context.images,
    problems: context.problems,
  };
}
