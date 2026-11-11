import type { Element } from "hast";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./markdown";
import { codeTag, renderBody, renderPost } from "./render";
import type { Post } from "./writing";

function postWith(source: string): Post {
  return {
    slug: "a-post",
    title: "A post",
    date: "2026-11-11",
    description: "A post.",
    tags: ["ai"],
    redirectFrom: [],
    body: parseMarkdown(source).body,
    images: [],
  };
}

describe("renderPost", () => {
  it("renders a post's body once", () => {
    const post = postWith("```ts\nconst a = 1;\n```\n");
    expect(renderPost(post)).toBe(renderPost({ ...post }));
  });

  it("renders again when the post is read again, as in a dev server after a save", async () => {
    const before = postWith("Old text.\n");
    const after = postWith("New text.\n");
    expect(JSON.stringify(await renderPost(before))).toContain("Old text.");
    expect(JSON.stringify(await renderPost(after))).toContain("New text.");
  });
});

describe("renderBody", () => {
  it("renders each fence as a code block, and leaves the post's own tree as it was", async () => {
    const { body } = parseMarkdown(
      "Some `inline` code.\n\n```ts\nconst a = 1;\n```\n\n```\nplain\n```\n",
    );
    const before = structuredClone(body);
    const rendered = await renderBody("a-post", body);
    expect(body).toEqual(before);
    const blocks = rendered.children.filter(
      (child): child is Element =>
        child.type === "element" && child.tagName === codeTag,
    );
    expect(blocks).toHaveLength(2);
    for (const block of blocks) {
      expect(JSON.stringify(block)).toContain("expressive-code");
    }
    expect(JSON.stringify(rendered)).toContain('"value":"inline"');
  });

  it("drops the fence's trailing newline", async () => {
    const { body } = parseMarkdown("```text\nline\n```\n");
    const rendered = await renderBody("a-post", body);
    expect(JSON.stringify(rendered)).not.toContain('"line\\n"');
    expect(JSON.stringify(rendered)).toContain('"value":"line"');
  });
});
