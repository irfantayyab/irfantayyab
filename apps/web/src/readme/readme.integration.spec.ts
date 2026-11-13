import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { productionUrl } from "@/production-url";
import { loadWritingFrom } from "@/writing/load";
import { writingDir } from "@/writing/source";
import { postPath } from "@/writing/writing";
import { withPosts } from "./readme";
import { readmePath } from "./source";

describe("the profile README", () => {
  it("lists the latest posts, written by pnpm readme", async () => {
    const [readme, { posts }] = await Promise.all([
      readFile(readmePath, "utf8"),
      loadWritingFrom(writingDir),
    ]);
    const listed = posts.map(({ title, slug, date }) => ({
      title,
      url: `${productionUrl}${postPath(slug)}`,
      date,
    }));
    await expect(withPosts(readme, listed)).toMatchFileSnapshot(readmePath);
  });

  it("links the site at its production address", async () => {
    const readme = await readFile(readmePath, "utf8");
    expect(readme).toContain(`](${productionUrl})`);
  });
});
