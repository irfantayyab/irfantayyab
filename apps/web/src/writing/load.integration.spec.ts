import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadWritingFrom } from "./load";
import { writingDir } from "./source";

const fixtureDir = path.join(process.cwd(), "fixtures", "writing");

describe("loadWritingFrom", () => {
  it("reads the posts, tags and redirects of a folder", async () => {
    const writing = await loadWritingFrom(fixtureDir);
    expect(writing.posts.map(({ slug, tags }) => ({ slug, tags }))).toEqual([
      { slug: "renamed-post", tags: ["ai", "web"] },
      { slug: "hello-world", tags: ["web"] },
    ]);
    expect(writing.tags.map(({ slug }) => slug)).toEqual(["ai", "web"]);
    expect(writing.redirects).toEqual([
      { from: "/writing/old-name", to: "/writing/renamed-post" },
      { from: "/writing/tags/www", to: "/writing/tags/web" },
    ]);
  });

  it("reads a post's images from its folder", async () => {
    const writing = await loadWritingFrom(fixtureDir);
    const post = writing.posts.find(({ slug }) => slug === "hello-world");
    expect(
      post?.images.map(({ file, width, height }) => ({ file, width, height })),
    ).toEqual([{ file: "a-swatch.webp", width: 40, height: 30 }]);
    expect(post?.images[0]?.data.byteLength).toBeGreaterThan(0);
  });

  it("fails on a folder that does not exist", async () => {
    await expect(
      loadWritingFrom(path.join(fixtureDir, "no-such-folder")),
    ).rejects.toThrow(/ENOENT/);
  });
});

describe("content/writing", () => {
  it("has no problems", async () => {
    await expect(loadWritingFrom(writingDir)).resolves.toBeDefined();
  });
});
