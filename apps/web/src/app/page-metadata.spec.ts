import { describe, expect, it } from "vitest";
import { resume } from "@/resume/claims";
import {
  cardSize,
  feedLinks,
  pageMetadata,
  siteCardPath,
} from "./page-metadata";

describe("pageMetadata", () => {
  it("gives a page its canonical link, the feed's link and a large card", () => {
    const metadata = pageMetadata({
      path: "/writing",
      title: "Writing",
      description: "All of it.",
    });
    expect(metadata.title).toBe("Writing");
    expect(metadata.alternates).toEqual({
      canonical: "/writing",
      types: feedLinks,
    });
    expect(metadata.twitter).toEqual({ card: "summary_large_image" });
    expect(metadata.openGraph).toEqual({
      type: "website",
      url: "/writing",
      siteName: resume.name,
      title: "Writing",
      description: "All of it.",
      images: [
        {
          url: siteCardPath,
          ...cardSize,
          alt: `${resume.name}, ${resume.headline}`,
        },
      ],
    });
  });

  it("leaves the title to the layout when a page has none, and names the card after the site", () => {
    const metadata = pageMetadata({ path: "/", description: "Home." });
    expect(metadata).not.toHaveProperty("title");
    expect(metadata.openGraph).toMatchObject({ title: resume.name });
  });

  it("makes a post an article, with its times, its tags and its own card", () => {
    const metadata = pageMetadata({
      path: "/writing/a-post",
      title: "A post",
      description: "A post.",
      card: { path: "/writing/a-post/og.png", alt: "A post" },
      article: {
        published: "2026-11-11",
        modified: "2026-11-20",
        tags: ["Testing", "Next.js"],
      },
    });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-11-11",
      modifiedTime: "2026-11-20",
      tags: ["Testing", "Next.js"],
      images: [{ url: "/writing/a-post/og.png", ...cardSize, alt: "A post" }],
    });
  });
});
