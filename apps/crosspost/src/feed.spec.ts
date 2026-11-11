import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FeedError,
  findPost,
  isWorkersDev,
  parseFeed,
  postSlug,
  readFeed,
} from "./feed.ts";

const fixture = path.join(import.meta.dirname, "..", "fixtures", "feed.xml");
const site = "https://portfolio.irfantayyab.workers.dev";

function feedWith(item: string) {
  return `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>T</title>${item}</channel></rss>`;
}

const item = (extra = "") =>
  `<item><title>A &amp; B</title><link>https://a.dev/writing/a-post</link><description>D.</description><pubDate>Wed, 11 Nov 2026 00:00:00 GMT</pubDate>${extra}<content:encoded>&lt;p&gt;1 &amp;#x3C; 2&lt;/p&gt;</content:encoded></item>`;

describe("parseFeed", () => {
  it("reads the site's own feed into its posts", async () => {
    const [post, ...rest] = parseFeed(await readFile(fixture, "utf8"));
    expect(rest).toEqual([]);
    expect(post).toMatchObject({
      slug: "holding-a-portfolio-to-its-resume",
      title: "Holding a portfolio to its resume",
      url: `${site}/writing/holding-a-portfolio-to-its-resume`,
      date: "2026-11-11",
      card: `${site}/writing/holding-a-portfolio-to-its-resume/og.png`,
      tags: [
        { slug: "testing", label: "Testing" },
        { slug: "nextjs", label: "Next.js" },
        { slug: "latex", label: "LaTeX" },
      ],
    });
    expect(post?.body).toMatch(/^<p>A portfolio and a resume/);
    expect(post?.body).toContain(
      `<img src="${site}/writing/holding-a-portfolio-to-its-resume/diagram-1.png" alt="From a saved resume to a checked one">`,
    );
  });

  it("decodes the feed's escaping once, leaving the body's own entities", () => {
    const [post] = parseFeed(feedWith(item()));
    expect(post?.title).toBe("A & B");
    expect(post?.body).toBe("<p>1 &#x3C; 2</p>");
    expect(post?.tags).toEqual([]);
  });

  it("refuses a tag without its tag page", () => {
    expect(() =>
      parseFeed(feedWith(item("<category>Testing</category>"))),
    ).toThrow(/tag page for "Testing"/);
  });

  it("refuses an item that is not a post", () => {
    expect(() =>
      parseFeed(feedWith(item().replace("/writing/a-post", "/about"))),
    ).toThrow(FeedError);
  });

  it("refuses something other than RSS", () => {
    expect(() => parseFeed("<html></html>")).toThrow(/not an RSS feed/);
  });
});

describe("postSlug", () => {
  it("reads the slug from a post's path, whatever its host", () => {
    expect(postSlug("https://a.dev/writing/a-post")).toBe("a-post");
    expect(postSlug("https://b.com/writing/a-post")).toBe("a-post");
  });
});

describe("readFeed", () => {
  it("fetches a feed by its URL", async () => {
    const xml = feedWith(item());
    const fetcher = (async (url: string) => {
      expect(url).toBe("https://a.dev/feed.xml");
      return new Response(xml);
    }) as typeof fetch;
    expect(await readFeed("https://a.dev/feed.xml", fetcher)).toHaveLength(1);
  });

  it("fails when the feed does not answer", async () => {
    const fetcher = (async () =>
      new Response("", { status: 404 })) as unknown as typeof fetch;
    await expect(readFeed("https://a.dev/feed.xml", fetcher)).rejects.toThrow(
      /answered 404/,
    );
  });

  it("names the feed when it cannot be fetched", async () => {
    const fetcher = (async () => {
      throw new TypeError("fetch failed", {
        cause: new Error("connect ECONNREFUSED 127.0.0.1:443"),
      });
    }) as typeof fetch;
    await expect(readFeed("https://a.dev/feed.xml", fetcher)).rejects.toThrow(
      "https://a.dev/feed.xml could not be reached: connect ECONNREFUSED 127.0.0.1:443",
    );
  });

  it("reads a feed from a file", async () => {
    expect(await readFeed(fixture)).toHaveLength(1);
  });
});

describe("findPost", () => {
  it("names the posts the feed holds when the slug is not one", () => {
    const posts = parseFeed(feedWith(item()));
    expect(() => findPost(posts, "other")).toThrow(
      '"other" is not in the feed; it holds a-post',
    );
  });
});

describe("isWorkersDev", () => {
  it("tells a workers.dev address from a domain", () => {
    expect(isWorkersDev(`${site}/writing/a`)).toBe(true);
    expect(isWorkersDev("https://irfantayyab.com/writing/a")).toBe(false);
  });
});
