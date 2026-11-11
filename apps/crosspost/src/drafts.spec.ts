import { describe, expect, it } from "vitest";
import { feedPost } from "./testing/post.ts";
import {
  compactBlocks,
  draftSections,
  flatQuotes,
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

  it("counts an emoji as two, a joined emoji sequence included", () => {
    expect(xLength("😀")).toBe(2);
    expect(xLength("👩‍💻")).toBe(2);
  });

  it("counts Latin and common punctuation as one, and other symbols as two", () => {
    expect(xLength("é—’")).toBe(3);
    expect(xLength("…→✓")).toBe(6);
    expect(xLength("日本")).toBe(4);
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

describe("compactBlocks", () => {
  it("drops the line breaks after a block, keeping the spaces inside one", () => {
    expect(
      compactBlocks(
        "<p>A <strong>b</strong>\n<a>c</a></p>\n<blockquote><p>Q</p>\n</blockquote>\n<pre><code>x\n</code></pre>\n<p>D</p>",
      ),
    ).toBe(
      "<p>A <strong>b</strong>\n<a>c</a></p><blockquote><p>Q</p></blockquote><pre><code>x\n</code></pre><p>D</p>",
    );
  });
});

describe("flatQuotes", () => {
  it("makes each paragraph of a quote a quote of its own, as Medium writes them", () => {
    expect(
      flatQuotes(
        "<p>Before.</p><blockquote><p><strong>Note:</strong> One.</p><p>Two.</p></blockquote><p>After.</p>",
      ),
    ).toBe(
      "<p>Before.</p><blockquote><strong>Note:</strong> One.</blockquote><blockquote>Two.</blockquote><p>After.</p>",
    );
  });

  it("leaves a quote holding more than paragraphs as it is", () => {
    const html =
      "<blockquote><p><strong>Tip:</strong></p><ul><li>One</li></ul></blockquote>";
    expect(flatQuotes(html)).toBe(html);
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

  it("gives Hashnode the article in Markdown, ending with where it was first published", () => {
    const sections = draftSections(feedPost());
    expect(sections.map(({ id }) => id)[1]).toBe("hashnode");
    const markdown = sections[1]?.fields.find(
      (field) => field.label === "Markdown",
    );
    expect(markdown).toMatchObject({
      kind: "text",
      value:
        "Body & more.\n\n```ts\na();\n```\n\n_Originally published at [a.dev](https://a.dev/writing/a-post)._\n",
    });
  });

  it("ends only the LinkedIn article with where the post was first published, since Medium adds its own", () => {
    const articleOf = (id: string) => {
      const field = draftSections(feedPost())
        .find((section) => section.id === id)
        ?.fields.find((candidate) => candidate.kind === "html");
      return field?.kind === "html" ? field.html : "";
    };
    expect(articleOf("linkedin-article")).toMatch(
      /Originally published at .*<\/p>$/,
    );
    expect(articleOf("medium")).toBe(feedPost().body);
  });

  it("points Medium at the PNG copy of a WebP image", () => {
    const body =
      '<figure><img src="https://a.dev/writing/a-post/shot.webp" alt="A shot"><figcaption>Caption</figcaption></figure>';
    const medium = draftSections(feedPost({ body }))
      .find(({ id }) => id === "medium")
      ?.fields.find((field) => field.kind === "html");
    expect(medium?.kind === "html" && medium.html).toBe(
      '<figure><img src="https://a.dev/writing/a-post/png/shot.png" alt="A shot"><figcaption>Caption</figcaption></figure>',
    );
  });

  it("marks LinkedIn's images in the article and lists each to copy, with its data when fetched", () => {
    const body =
      '<p>Text.</p><figure><img src="https://a.dev/writing/a-post/shot.webp" alt="A shot"><figcaption>Caption</figcaption></figure><p><img src="https://a.dev/writing/a-post/diagram-1.png" alt="A diagram"></p>';
    const data = new Map([
      [
        "https://a.dev/writing/a-post/png/shot.png",
        "data:image/png;base64,AA==",
      ],
    ]);
    const fields =
      draftSections(feedPost({ body }), data).find(
        ({ id }) => id === "linkedin-article",
      )?.fields ?? [];
    const article = fields.find((field) => field.kind === "html");
    expect(article?.kind === "html" && article.html).toMatch(
      /^<p>Text\.<\/p><p>\[Image 1: A shot\]<\/p><p>\[Image 2: A diagram\]<\/p><p><em>Originally/,
    );
    expect(
      fields
        .filter((field) => field.kind === "image")
        .map((field) => field.kind === "image" && [field.label, field.data]),
    ).toEqual([
      ["Image 1", "data:image/png;base64,AA=="],
      ["Image 2", undefined],
    ]);
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
