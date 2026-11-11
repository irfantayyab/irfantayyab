import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/site";
import { loadWriting } from "@/writing/load";
import { postPath, tagPath } from "@/writing/writing";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { posts, tags } = await loadWriting();
  return [
    { url: absoluteUrl("/") },
    { url: absoluteUrl("/writing") },
    ...posts.map((post) => ({
      url: absoluteUrl(postPath(post.slug)),
      lastModified: post.updated ?? post.date,
    })),
    ...tags.map((tag) => ({ url: absoluteUrl(tagPath(tag.slug)) })),
  ];
}
