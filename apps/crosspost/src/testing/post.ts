import type { FeedPost } from "../feed.ts";

export function feedPost(overrides: Partial<FeedPost> = {}): FeedPost {
  const url = overrides.url ?? "https://a.dev/writing/a-post";
  return {
    slug: "a-post",
    title: "A post",
    url,
    description: "What the post is about.",
    date: "2026-11-11",
    tags: [
      { slug: "testing", label: "Testing" },
      { slug: "nextjs", label: "Next.js" },
    ],
    body: '<p>Body &#x26; more.</p><pre><code class="language-ts">a();</code></pre>',
    card: `${url}/og.png`,
    ...overrides,
  };
}
