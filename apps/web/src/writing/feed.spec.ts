import { toHtml } from "hast-util-to-html";
import { describe, expect, it } from "vitest";
import { diagramAnchor } from "@/app/page-ids";
import { absoluteUrl } from "@/site";
import { feedDiagramLinks } from "@/testing/feed-diagrams";
import { nestedDiagrams, nestedDiagramTitles } from "@/testing/nested-diagrams";
import { diagramText, feedBody, feedXml } from "./feed";
import { parseMarkdown } from "./markdown";
import { postPath, type Post, type Writing } from "./writing";

function postWith(source: string, overrides: Partial<Post> = {}): Post {
  return {
    slug: "a-post",
    title: "A post",
    date: "2026-11-11",
    description: "A post.",
    tags: ["ai"],
    redirectFrom: [],
    body: parseMarkdown(source).body,
    images: [],
    ...overrides,
  };
}

function html(source: string) {
  return toHtml(feedBody(postWith(source)));
}

const postUrl = absoluteUrl(postPath("a-post"));

const diagram = [
  "```mermaid",
  "flowchart TD",
  "  accTitle: Saving builds the PDF",
  "  accDescr: The source is built,",
  "  A --> B",
  "```",
  "",
].join("\n");

describe("feedBody", () => {
  it("writes code as plain pre and code, with its lines as written", () => {
    expect(html("```ts\nconst a = 1;\nconst b = 2;\n```\n")).toBe(
      '<pre><code class="language-ts">const a = 1;\nconst b = 2;</code></pre>',
    );
  });

  it("puts a fence's title in bold above its code", () => {
    expect(html('```js title="scripts/a.mjs" {1}\nrun();\n```\n')).toBe(
      '<p><strong>scripts/a.mjs</strong></p><pre><code class="language-js">run();</code></pre>',
    );
  });

  it("writes a diagram as its title, its description and a link to it on the post", () => {
    expect(html(diagram)).toBe(
      `<p><strong>Saving builds the PDF</strong></p><p>The source is built,</p><p><a href="${postUrl}#diagram-1">The diagram is on the site.</a></p>`,
    );
  });

  it("links each diagram to its own place on the post, counting nested ones in order", () => {
    expect(parseMarkdown(nestedDiagrams).problems).toEqual([]);
    expect(feedDiagramLinks(html(nestedDiagrams))).toEqual(
      nestedDiagramTitles.map((title, i) => ({
        title,
        href: `${postUrl}#${diagramAnchor(i)}`,
      })),
    );
  });

  it("writes a callout as a quote with its label", () => {
    const out = html("> [!NOTE]\n> Mind the gap.\n");
    expect(out).toMatch(/^<blockquote>/);
    expect(out).toContain("<strong>Note</strong>");
    expect(out).toContain("Mind the gap.");
    expect(out).not.toContain('role="note"');
  });

  it("drops a heading's link to itself, keeping its id", () => {
    expect(html("## A section\n")).toBe('<h2 id="a-section">A section</h2>');
  });

  it("unwraps a table from its scrolling box", () => {
    const out = html("| a |\n| - |\n| 1 |\n");
    expect(out).toMatch(/^<table>/);
    expect(out).not.toContain("tabindex");
  });

  it("makes links and image sources absolute", () => {
    const out = html(
      "[Resume](/resume.pdf), [up](#a).\n\n![Alt](/writing/a-post/a.webp)\n",
    );
    expect(out).toContain(`href="${absoluteUrl("/resume.pdf")}"`);
    expect(out).toContain(`href="${postUrl}#a"`);
    expect(out).toContain(`src="${absoluteUrl("/writing/a-post/a.webp")}"`);
  });

  it("leaves the post's own tree as it was", () => {
    const post = postWith(`## A section\n\n${diagram}`);
    const before = structuredClone(post.body);
    feedBody(post);
    expect(post.body).toEqual(before);
  });
});

describe("diagramText", () => {
  it("reads a description written as a block", () => {
    expect(
      diagramText(
        "flowchart TD\n  accTitle: A title\n  accDescr {\n    Over two\n    lines\n  }\n",
      ),
    ).toEqual({ title: "A title", description: "Over two lines" });
  });
});

describe("feedXml", () => {
  const writing: Writing = {
    posts: [
      postWith("New & 1 < 2.\n", {
        slug: "newer",
        title: "Tom & Jerry <3",
        date: "2026-11-11",
        tags: ["ai", "testing"],
      }),
      postWith("Old.\n", {
        slug: "older",
        title: "Older",
        date: "2026-10-01",
        updated: "2026-11-20",
      }),
    ],
    tags: [
      { slug: "ai", label: "AI", redirectFrom: [] },
      { slug: "testing", label: "Testing", redirectFrom: [] },
    ],
    redirects: [],
  };
  const xml = feedXml(writing);

  it("lists each post with its permanent link as its guid", () => {
    for (const slug of ["newer", "older"]) {
      const url = absoluteUrl(postPath(slug));
      expect(xml).toContain(`<link>${url}</link>`);
      expect(xml).toContain(`<guid isPermaLink="true">${url}</guid>`);
    }
    expect(xml.indexOf("newer")).toBeLessThan(xml.indexOf("older"));
  });

  it("escapes titles and the body's HTML", () => {
    expect(xml).toContain("<title>Tom &amp; Jerry &lt;3</title>");
    expect(xml).toContain(
      "<content:encoded>&lt;p&gt;New &amp;#x26; 1 &amp;#x3C; 2.&lt;/p&gt;</content:encoded>",
    );
  });

  it("dates each item by its date, and the feed by the newest date or update", () => {
    expect(xml).toContain("<pubDate>Wed, 11 Nov 2026 00:00:00 GMT</pubDate>");
    expect(xml).toContain("<pubDate>Thu, 01 Oct 2026 00:00:00 GMT</pubDate>");
    expect(xml).toContain(
      "<lastBuildDate>Fri, 20 Nov 2026 00:00:00 GMT</lastBuildDate>",
    );
  });

  it("names each post's tags by their labels", () => {
    expect(xml).toContain("<category>AI</category>");
    expect(xml).toContain("<category>Testing</category>");
  });

  it("is the same every time it is built from the same posts", () => {
    expect(feedXml(writing)).toBe(xml);
  });
});
