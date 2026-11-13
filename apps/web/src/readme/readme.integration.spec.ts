import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { introLine } from "@/portfolio/intro";
import { portfolioPdfPath, resumePath } from "@/portfolio/links";
import { productionUrl } from "@/production-url";
import { resume } from "@/resume/claims";
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

  it("says the headline and the bio's first line as the site does", async () => {
    const readme = await readFile(readmePath, "utf8");
    expect(readme).toContain(`**${resume.headline}.** ${introLine}`);
  });

  it("links the site, LinkedIn, the resume and the portfolio PDF where the site does", async () => {
    const readme = await readFile(readmePath, "utf8");
    for (const url of [
      productionUrl,
      resume.links.linkedin.url,
      `${productionUrl}${resumePath}`,
      `${productionUrl}${portfolioPdfPath}`,
      `${productionUrl}/writing`,
    ]) {
      expect(readme).toContain(`](${url})`);
    }
  });
});
