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
