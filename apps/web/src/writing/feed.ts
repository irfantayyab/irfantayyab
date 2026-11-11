import { MetaOptions } from "expressive-code";
import type { Element, ElementContent, Root, RootContent } from "hast";
import { toHtml } from "hast-util-to-html";
import { diagramImageFile } from "@/app/page-ids";
import { feedPath, feedTitle, writingDescription } from "@/app/page-metadata";
import { absoluteUrl } from "@/site";
import {
  postFilePath,
  postPath,
  tagPath,
  type Post,
  type Writing,
} from "./writing";

type Context = {
  slug: string;
  postUrl: string;
  diagrams: number;
};

function classesOf(node: Element) {
  const className = node.properties.className;
  return Array.isArray(className) ? className.map(String) : [];
}

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

function element(
  tagName: string,
  children: ElementContent[],
  properties: Element["properties"] = {},
): Element {
  return { type: "element", tagName, properties, children };
}

function text(value: string): ElementContent {
  return { type: "text", value };
}

function boldLine(value: string) {
  return element("p", [element("strong", [text(value)])]);
}

function squash(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function diagramText(source: string) {
  const title = /^\s*accTitle\s*:\s*(.+)$/m.exec(source)?.[1];
  const description =
    /^\s*accDescr\s*:\s*(.+)$/m.exec(source)?.[1] ??
    /^\s*accDescr\s*\{([^}]*)\}/m.exec(source)?.[1];
  return {
    title: squash(title ?? ""),
    description: squash(description ?? ""),
  };
}

function codeBlock(pre: Element, context: Context): Element[] | undefined {
  const [code, ...rest] = pre.children;
  if (code?.type !== "element" || code.tagName !== "code" || rest.length > 0) {
    return undefined;
  }
  const source = textOf(code).replace(/\n$/, "");
  if (classesOf(code).includes("language-mermaid")) {
    const { title, description } = diagramText(source);
    const src = absoluteUrl(
      postFilePath(context.slug, diagramImageFile(context.diagrams++)),
    );
    return [
      element("p", [element("img", [], { src, alt: title })]),
      element("p", [text(description)]),
    ];
  }
  const meta = (code.data as { meta?: unknown } | undefined)?.meta;
  const title =
    typeof meta === "string"
      ? new MetaOptions(meta).getString("title")
      : undefined;
  const block = element("pre", [
    element("code", [text(source)], { className: classesOf(code) }),
  ]);
  return title ? [boldLine(title), block] : [block];
}

function portable(node: RootContent, context: Context): RootContent[] {
  if (node.type !== "element") {
    return [node];
  }
  const classes = classesOf(node);
  if (node.tagName === "pre") {
    const block = codeBlock(node, context);
    if (block) {
      return block;
    }
  }
  const children = node.children.flatMap(
    (child) => portable(child, context) as ElementContent[],
  );
  if (node.tagName === "a" && classes.includes("heading-link")) {
    return children;
  }
  if (node.tagName === "div" && classes.includes("table-scroll")) {
    return children;
  }
  if (node.tagName === "div" && classes.includes("callout")) {
    return [element("blockquote", children)];
  }
  const properties = { ...node.properties };
  for (const key of ["href", "src"] as const) {
    const value = properties[key];
    if (typeof value === "string") {
      properties[key] = new URL(value, context.postUrl).href;
    }
  }
  return [{ ...node, properties, children }];
}

export function feedBody(post: Post): Root {
  const context: Context = {
    slug: post.slug,
    postUrl: absoluteUrl(postPath(post.slug)),
    diagrams: 0,
  };
  return {
    type: "root",
    children: post.body.children.flatMap((child) => portable(child, context)),
  };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rfc822(day: string) {
  return new Date(`${day}T00:00:00Z`).toUTCString();
}

function tag(name: string, value: string, attributes = "") {
  return `<${name}${attributes}>${escapeXml(value)}</${name}>`;
}

export function feedXml({ posts, tags }: Writing) {
  const newest = posts
    .flatMap((post) => [post.date, post.updated ?? post.date])
    .reduce((latest, day) => (day > latest ? day : latest));
  const labels = new Map(tags.map((tag) => [tag.slug, tag.label]));
  const items = posts.map((post) => {
    const url = absoluteUrl(postPath(post.slug));
    return [
      "<item>",
      tag("title", post.title),
      tag("link", url),
      tag("guid", url, ' isPermaLink="true"'),
      tag("pubDate", rfc822(post.date)),
      tag("description", post.description),
      ...post.tags.map((slug) =>
        tag(
          "category",
          labels.get(slug) ?? slug,
          ` domain="${escapeXml(absoluteUrl(tagPath(slug)))}"`,
        ),
      ),
      tag("content:encoded", toHtml(feedBody(post))),
      "</item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    "<channel>",
    tag("title", feedTitle),
    tag("link", absoluteUrl("/writing")),
    tag("description", writingDescription),
    tag("language", "en"),
    tag("lastBuildDate", rfc822(newest)),
    `<atom:link href="${escapeXml(absoluteUrl(feedPath))}" rel="self" type="application/rss+xml"/>`,
    ...items,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}
