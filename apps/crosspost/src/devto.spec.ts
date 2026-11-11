import { describe, expect, it } from "vitest";
import { feedPost } from "./testing/post.ts";
import {
  devToApi,
  devToArticle,
  devToClient,
  devToPageSize,
  type DevToArticle,
} from "./devto.ts";

type Call = { method: string; url: string; body: unknown; key: string | null };

function fakeDevTo(
  pages: DevToArticle[][],
  answer: (call: Call) => Response = () =>
    Response.json({
      id: 7,
      url: "https://dev.to/me/a-post-1",
      published: false,
      canonical_url: null,
    }),
) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    const call: Call = {
      method: init.method ?? "GET",
      url,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      key: new Headers(init.headers).get("api-key"),
    };
    calls.push(call);
    if (call.method === "GET") {
      const page = Number(new URL(url).searchParams.get("page"));
      return Response.json(pages[page - 1] ?? []);
    }
    return answer(call);
  }) as typeof fetch;
  return { calls, client: devToClient("key", fetcher) };
}

function article(overrides: Partial<DevToArticle>): DevToArticle {
  return {
    id: 1,
    url: "https://dev.to/me/other",
    published: true,
    canonical_url: null,
    ...overrides,
  };
}

describe("devToArticle", () => {
  it("carries the canonical link, the card, the description and the tags' slugs", () => {
    expect(devToArticle(feedPost(), false)).toEqual({
      title: "A post",
      body_markdown: "Body & more.\n\n```ts\na();\n```\n",
      published: false,
      canonical_url: "https://a.dev/writing/a-post",
      description: "What the post is about.",
      main_image: "https://a.dev/writing/a-post/og.png",
      tags: "testing, nextjs",
    });
  });

  it("sends no more than four tags", () => {
    const tags = ["a", "b", "c", "d", "e"].map((slug) => ({
      slug,
      label: slug,
    }));
    expect(devToArticle(feedPost({ tags }), false).tags).toBe("a, b, c, d");
  });
});

describe("devToClient", () => {
  it("creates a draft when the post has no article yet", async () => {
    const { calls, client } = fakeDevTo([[article({})]]);
    expect(await client.post(feedPost(), false)).toEqual({
      url: "https://dev.to/me/a-post-1",
      action: "created",
      published: false,
    });
    expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual([
      `GET ${devToApi}/articles/me/all?page=1&per_page=${devToPageSize}`,
      `GET ${devToApi}/articles/me/all?page=2&per_page=${devToPageSize}`,
      `POST ${devToApi}/articles`,
    ]);
    expect(calls.every(({ key }) => key === "key")).toBe(true);
    expect(calls[2]?.body).toMatchObject({ article: { published: false } });
  });

  it("updates the article whose canonical link is the post's path, even on another host", async () => {
    const { calls, client } = fakeDevTo([
      [article({ id: 3, canonical_url: "https://old.dev/writing/a-post" })],
    ]);
    const result = await client.post(feedPost(), false);
    expect(result.action).toBe("updated");
    expect(calls[1]).toMatchObject({
      method: "PUT",
      url: `${devToApi}/articles/3`,
      body: {
        article: { canonical_url: "https://a.dev/writing/a-post" },
      },
    });
  });

  it("never turns a published article back into a draft", async () => {
    const { calls, client } = fakeDevTo([
      [article({ canonical_url: "https://a.dev/writing/a-post" })],
    ]);
    expect((await client.post(feedPost(), false)).published).toBe(true);
    expect(calls[1]?.body).toMatchObject({ article: { published: true } });
  });

  it("looks through every page of articles, however short dev.to makes them", async () => {
    const { calls, client } = fakeDevTo([
      [article({ id: 10 })],
      [article({ id: 2, canonical_url: "https://a.dev/writing/a-post" })],
    ]);
    await client.post(feedPost(), false);
    expect(calls.map(({ method }) => method)).toEqual(["GET", "GET", "PUT"]);
    expect(calls[2]?.url).toBe(`${devToApi}/articles/2`);
  });

  it("reports what dev.to answered when it refuses", async () => {
    const { client } = fakeDevTo(
      [[]],
      () => new Response("Unprocessable", { status: 422 }),
    );
    await expect(client.post(feedPost(), false)).rejects.toThrow(
      "POST /articles answered 422: Unprocessable",
    );
  });

  it("names dev.to's address and the cause when it cannot be reached", async () => {
    const fetcher = (async () => {
      throw new TypeError("fetch failed", {
        cause: new Error("getaddrinfo ENOTFOUND dev.to"),
      });
    }) as typeof fetch;
    await expect(
      devToClient("key", fetcher).post(feedPost(), false),
    ).rejects.toThrow(
      `${devToApi}/articles/me/all?page=1&per_page=${devToPageSize} could not be reached: getaddrinfo ENOTFOUND dev.to`,
    );
  });

  it("reports an answer that is not JSON", async () => {
    const { client } = fakeDevTo([[]], () => new Response("<html>"));
    await expect(client.post(feedPost(), false)).rejects.toThrow(
      /something other than JSON: <html>/,
    );
  });
});
