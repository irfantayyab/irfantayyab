import { describe, expect, it } from "vitest";
import { latestPostCount } from "@/writing/writing";
import {
  endMarker,
  postLine,
  ReadmeError,
  type ReadmePost,
  startMarker,
  withPosts,
} from "./readme";

const post: ReadmePost = {
  title: "A post",
  url: "https://example.com/writing/a-post",
  date: "2026-11-11",
};

const readme = [
  "# Name",
  "",
  "## Latest posts",
  "",
  startMarker,
  "",
  "- [Stale](https://example.com/writing/stale) · 1 Jan 2026",
  "",
  endMarker,
  "",
  "[All writing](https://example.com/writing)",
  "",
].join("\n");

describe("postLine", () => {
  it("writes a post as a list item with its date", () => {
    expect(postLine(post)).toBe(
      "- [A post](https://example.com/writing/a-post) · 11 Nov 2026",
    );
  });

  it("escapes what Markdown would read in a title", () => {
    expect(postLine({ ...post, title: "snake_case [a] *b* <x> `c` \\" })).toBe(
      "- [snake\\_case \\[a\\] \\*b\\* \\<x\\> \\`c\\` \\\\](https://example.com/writing/a-post) · 11 Nov 2026",
    );
  });

  it("encodes what would end a link early", () => {
    expect(postLine({ ...post, url: "https://example.com/a(b) c" })).toBe(
      "- [A post](https://example.com/a%28b%29%20c) · 11 Nov 2026",
    );
  });
});

describe("withPosts", () => {
  it("replaces only the lines between the markers", () => {
    expect(withPosts(readme, [post])).toBe(
      readme.replace(
        "- [Stale](https://example.com/writing/stale) · 1 Jan 2026",
        "- [A post](https://example.com/writing/a-post) · 11 Nov 2026",
      ),
    );
  });

  it("lists the posts in the order given, as many as / shows", () => {
    const posts = Array.from({ length: latestPostCount + 2 }, (_, index) => ({
      ...post,
      title: `Post ${index + 1}`,
    }));
    const lines = withPosts(readme, posts)
      .split("\n")
      .filter((line) => line.startsWith("- ["));
    expect(lines).toHaveLength(latestPostCount);
    expect(lines[0]).toContain("Post 1");
    expect(lines.at(-1)).toContain(`Post ${latestPostCount}`);
  });

  it("changes nothing on a second run", () => {
    const once = withPosts(readme, [post]);
    expect(withPosts(once, [post])).toBe(once);
  });

  it("fills a section that is empty", () => {
    const empty = `${startMarker}\n${endMarker}\n`;
    expect(withPosts(empty, [post])).toBe(
      `${startMarker}\n\n${postLine(post)}\n\n${endMarker}\n`,
    );
  });

  it("finds a marker with spaces around it", () => {
    const spaced = readme.replace(startMarker, `  ${startMarker} `);
    expect(withPosts(spaced, [post])).toContain(postLine(post));
  });

  it.each([
    ["the start", readme.replace(startMarker, "")],
    ["the end", readme.replace(endMarker, "")],
  ])("refuses a README without %s marker", (_, text) => {
    expect(() => withPosts(text, [post])).toThrow(/holds it 0 times/);
  });

  it("refuses a marker held twice", () => {
    expect(() => withPosts(`${readme}${startMarker}\n`, [post])).toThrow(
      /holds it 2 times/,
    );
  });

  it("refuses markers in the wrong order", () => {
    expect(() => withPosts(`${endMarker}\n${startMarker}\n`, [post])).toThrow(
      /comes before/,
    );
  });

  it("refuses an empty list of posts", () => {
    expect(() => withPosts(readme, [])).toThrow(ReadmeError);
  });
});
