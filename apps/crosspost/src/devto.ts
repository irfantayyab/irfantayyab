import { postSlug, type FeedPost } from "./feed.ts";
import { toMarkdown } from "./markdown.ts";
import { request } from "./request.ts";

export const devToApi = "https://dev.to/api";
export const devToTagLimit = 4;
export const devToPageSize = 1000;

export type DevToArticle = {
  id: number;
  url: string;
  published: boolean;
  canonical_url: string | null;
};

export type DevToResult = {
  url: string;
  action: "created" | "updated";
  published: boolean;
};

export class DevToError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevToError";
  }
}

function slugOf(url: string | null) {
  if (!url) {
    return undefined;
  }
  try {
    return postSlug(url);
  } catch {
    return undefined;
  }
}

export function devToArticle(post: FeedPost, published: boolean) {
  return {
    title: post.title,
    body_markdown: toMarkdown(post.body),
    published,
    canonical_url: post.url,
    description: post.description,
    main_image: post.card,
    tags: post.tags
      .slice(0, devToTagLimit)
      .map((tag) => tag.slug)
      .join(", "),
  };
}

export function devToClient(apiKey: string, fetcher: typeof fetch = fetch) {
  async function call<T>(method: string, path: string, body?: unknown) {
    const { ok, status, text } = await request(fetcher, `${devToApi}${path}`, {
      method,
      headers: {
        "api-key": apiKey,
        accept: "application/vnd.forem.api-v1+json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!ok) {
      throw new DevToError(
        `${method} ${path} answered ${status}: ${text.slice(0, 300)}`,
      );
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new DevToError(
        `${method} ${path} answered something other than JSON: ${text.slice(0, 300)}`,
      );
    }
  }

  async function find(slug: string) {
    for (let page = 1; ; page++) {
      const articles = await call<DevToArticle[]>(
        "GET",
        `/articles/me/all?page=${page}&per_page=${devToPageSize}`,
      );
      const match = articles.find(
        (article) => slugOf(article.canonical_url) === slug,
      );
      if (match || articles.length === 0) {
        return match;
      }
    }
  }

  return {
    async post(post: FeedPost, publish: boolean): Promise<DevToResult> {
      const existing = await find(post.slug);
      if (existing) {
        const published = publish || existing.published;
        const article = await call<DevToArticle>(
          "PUT",
          `/articles/${existing.id}`,
          { article: devToArticle(post, published) },
        );
        return { url: article.url, action: "updated", published };
      }
      const article = await call<DevToArticle>("POST", "/articles", {
        article: devToArticle(post, publish),
      });
      return { url: article.url, action: "created", published: publish };
    },
  };
}
