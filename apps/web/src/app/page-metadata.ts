import type { Metadata } from "next";
import { resume } from "@/resume/claims";

export const feedPath = "/feed.xml";
export const siteCardPath = "/og.png";
export const cardSize = { width: 1200, height: 630 };

export const feedTitle = `Writing by ${resume.name}`;

export const writingDescription = "Everything I have written, newest first.";

export const siteDescription = `Projects, experience and writing by ${resume.name}, ${resume.headline}.`;

export const feedLinks = {
  "application/rss+xml": [{ url: feedPath, title: feedTitle }],
};

type Article = {
  published: string;
  modified?: string;
  tags: string[];
};

type Page = {
  path: string;
  title?: string;
  description: string;
  card?: { path: string; alt: string };
  article?: Article;
};

export function pageMetadata({
  path,
  title,
  description,
  card = { path: siteCardPath, alt: `${resume.name}, ${resume.headline}` },
  article,
}: Page): Metadata {
  const shared = {
    url: path,
    siteName: resume.name,
    title: title ?? resume.name,
    description,
    images: [{ url: card.path, ...cardSize, alt: card.alt }],
  };
  return {
    ...(title === undefined ? {} : { title }),
    description,
    alternates: { canonical: path, types: feedLinks },
    openGraph: article
      ? {
          ...shared,
          type: "article",
          publishedTime: article.published,
          modifiedTime: article.modified,
          tags: article.tags,
        }
      : { ...shared, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}
