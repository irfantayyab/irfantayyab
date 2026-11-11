import { readFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { request } from "./request.ts";

export type Tag = {
  slug: string;
  label: string;
};

export type FeedPost = {
  slug: string;
  title: string;
  url: string;
  description: string;
  date: string;
  tags: readonly Tag[];
  body: string;
  card: string;
};

type RawCategory = { "#text"?: unknown; "@_domain"?: unknown };

type RawItem = {
  title?: unknown;
  link?: unknown;
  description?: unknown;
  pubDate?: unknown;
  category?: (RawCategory | string)[];
  "content:encoded"?: unknown;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: false,
  isArray: (name) => name === "item" || name === "category",
});

export class FeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedError";
  }
}

function text(value: unknown, what: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new FeedError(`the feed has an item without its ${what}`);
  }
  return value.trim();
}

export function postSlug(url: string) {
  const match = /^\/writing\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(
    new URL(url).pathname,
  );
  if (!match?.[1]) {
    throw new FeedError(`${url} is not a post's address`);
  }
  return match[1];
}

function tagOf(raw: RawCategory | string): Tag {
  const category = typeof raw === "string" ? { "#text": raw } : raw;
  const label = text(category["#text"], "tag's label");
  const domain = text(category["@_domain"], `tag page for "${label}"`);
  const slug = /^\/writing\/tags\/([a-z0-9]+)$/.exec(
    new URL(domain).pathname,
  )?.[1];
  if (!slug) {
    throw new FeedError(`${domain} is not a tag's page`);
  }
  return { slug, label };
}

function day(pubDate: string) {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) {
    throw new FeedError(`"${pubDate}" is not a date`);
  }
  return date.toISOString().slice(0, 10);
}

export function parseFeed(xml: string): FeedPost[] {
  const data = parser.parse(xml) as {
    rss?: { channel?: { item?: RawItem[] } };
  };
  const channel = data.rss?.channel;
  if (!channel) {
    throw new FeedError("this is not an RSS feed");
  }
  return (channel.item ?? []).map((item) => {
    const url = text(item.link, "link");
    return {
      slug: postSlug(url),
      title: text(item.title, "title"),
      url,
      description: text(item.description, "description"),
      date: day(text(item.pubDate, "date")),
      tags: (item.category ?? []).map(tagOf),
      body: text(item["content:encoded"], "body"),
      card: `${url}/og.png`,
    };
  });
}

export async function readFeed(
  source: string,
  fetcher: typeof fetch = fetch,
): Promise<FeedPost[]> {
  if (/^https?:\/\//.test(source)) {
    const answer = await request(fetcher, source);
    if (!answer.ok) {
      throw new FeedError(`${source} answered ${answer.status}`);
    }
    return parseFeed(answer.text);
  }
  return parseFeed(await readFile(source, "utf8"));
}

export function findPost(posts: readonly FeedPost[], slug: string) {
  const post = posts.find((candidate) => candidate.slug === slug);
  if (!post) {
    const known = posts.map((candidate) => candidate.slug).join(", ");
    throw new FeedError(
      `"${slug}" is not in the feed${known ? `; it holds ${known}` : ""}`,
    );
  }
  return post;
}

export function isWorkersDev(url: string) {
  return new URL(url).hostname.endsWith(".workers.dev");
}
