import { describe, expect, it } from "vitest";
import { feedPost } from "./testing/post.ts";
import {
  draftSections,
  draftsPage,
  escapeHtml,
  linkedInPost,
  originNote,
  xLength,
  xLimit,
  xPost,
} from "./drafts.ts";

describe("xLength", () => {
  it("counts a link as 23 characters, whatever its length", () => {
    expect(xLength("ab https://a.dev/writing/a-very-long-slug-indeed")).toBe(
      26,
    );
  });

  it("counts an emoji as one character", () => {
    expect(xLength("😀")).toBe(1);
  });
});

describe("xPost", () => {
  it("carries the title, the description and the link when they fit", () => {
    const post = feedPost();
    expect(xPost(post)).toBe(
      "A post\n\nWhat the post is about.\n\nhttps://a.dev/writing/a-post",
    );
  });

  it("drops the description when it would not fit", () => {
    const post = feedPost({ description: "x".repeat(xLimit) });
    expect(xPost(post)).toBe("A post\n\nhttps://a.dev/writing/a-post");
    expect(xLength(xPost(post))).toBeLessThanOrEqual(xLimit);
  });
});

describe("linkedInPost", () => {
  it("carries the title, the description and the link", () => {
    expect(linkedInPost(feedPost())).toBe(
      "A post\n\nWhat the post is about.\n\nhttps://a.dev/writing/a-post",
    );
  });
});

describe("originNote", () => {
  it("links the post on the site by its host", () => {
    expect(originNote(feedPost())).toBe(
      '<p><em>Originally published at <a href="https://a.dev/writing/a-post">a.dev</a>.</em></p>',
    );
  });
});

describe("escapeHtml", () => {
  it("escapes what would break an attribute or an element", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;",
    );
  });
});

describe("draftSections", () => {
  it("makes a draft for each platform posted by hand", () => {
    expect(draftSections(feedPost()).map(({ id }) => id)).toEqual([
      "medium",
      "hashnode",
      "linkedin-article",
      "linkedin-post",
      "x",
      "reddit",
      "hacker-news",
    ]);
  });

  it("gives Hashnode the article in Markdown", () => {
    const sections = draftSections(feedPost());
    expect(sections.map(({ id }) => id)[1]).toBe("hashnode");
    const markdown = sections[1]?.fields.find(
      (field) => field.label === "Markdown",
    );
    expect(markdown).toMatchObject({
      kind: "text",
      value: "Body & more.\n\n```ts\na();\n```\n",
    });
  });

  it("ends the Medium and LinkedIn articles with where the post was first published", () => {
    for (const id of ["medium", "linkedin-article"]) {
      const article = draftSections(feedPost())
        .find((section) => section.id === id)
        ?.fields.find((field) => field.kind === "html");
      expect(article?.kind === "html" && article.html).toMatch(
        /Originally published at .*<\/p>$/,
      );
    }
  });

  it("warns when a title is too long for Hacker News", () => {
    const title = draftSections(feedPost({ title: "t".repeat(81) }))
      .find(({ id }) => id === "hacker-news")
      ?.fields.find((field) => field.label === "Title");
    expect(title?.kind === "text" && title.note).toBe(
      "81 characters, over the 80 Hacker News allows",
    );
  });
});

describe("draftsPage", () => {
  it("escapes the post's text, but keeps its body as HTML", () => {
    const page = draftsPage(feedPost({ title: "A <b> & c" }));
    expect(page).toContain("<title>Cross-posts: A &lt;b&gt; &amp; c</title>");
    expect(page).toContain("<p>Body &#x26; more.</p>");
    expect(page).not.toContain("<b>");
  });
});
