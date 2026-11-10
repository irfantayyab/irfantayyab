import type { Root } from "hast";
import { parse as parseYaml } from "yaml";
import { parseMarkdown } from "./markdown";
import {
  frontMatterSchema,
  issues,
  postSlug,
  reservedPostSlugs,
  tagsSchema,
} from "./schema";

export const postFile = "index.md";
export const tagsFile = "tags.yaml";
export const publishedFile = "published.txt";

export type WritingEntry =
  | { name: string; kind: "folder"; post?: string }
  | { name: string; kind: "file" };

export type WritingFiles = {
  entries: readonly WritingEntry[];
  tags?: string;
  published?: string;
};

export type Post = {
  slug: string;
  title: string;
  date: string;
  updated?: string;
  description: string;
  tags: readonly string[];
  redirectFrom: readonly string[];
  body: Root;
};

export type Tag = {
  slug: string;
  label: string;
  redirectFrom: readonly string[];
};

export type Redirect = {
  from: string;
  to: string;
};

export type Writing = {
  posts: readonly Post[];
  tags: readonly Tag[];
  redirects: readonly Redirect[];
};

export class WritingError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      `content/writing has ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n${problems.map((problem) => `- ${problem}`).join("\n")}`,
    );
    this.name = "WritingError";
    this.problems = problems;
  }
}

export function postPath(slug: string) {
  return `/writing/${slug}`;
}

export function tagPath(slug: string) {
  return `/writing/tags/${slug}`;
}

function readPost(
  slug: string,
  source: string,
  problems: string[],
): Post | undefined {
  const where = `${slug}/${postFile}`;
  const before = problems.length;
  if (!postSlug.test(slug)) {
    problems.push(`${slug}/: a post's folder name is its slug, in kebab case`);
  }
  if (reservedPostSlugs.has(slug)) {
    problems.push(`${slug}/: "${slug}" is reserved for /writing/${slug}/…`);
  }
  const markdown = parseMarkdown(source);
  problems.push(...markdown.problems.map((problem) => `${where}: ${problem}`));
  const front = frontMatterSchema.safeParse(markdown.matter);
  if (!front.success) {
    problems.push(...issues(front.error).map((issue) => `${where}: ${issue}`));
    return undefined;
  }
  const { updated, date, tags, redirectFrom } = front.data;
  if (updated !== undefined && updated < date) {
    problems.push(`${where}: updated (${updated}) is before date (${date})`);
  }
  for (const tag of new Set(tags.filter((tag, i) => tags.indexOf(tag) !== i))) {
    problems.push(`${where}: tag "${tag}" is listed twice`);
  }
  if (redirectFrom.includes(slug)) {
    problems.push(`${where}: redirectFrom names the post's own slug`);
  }
  for (const old of redirectFrom.filter((old) => reservedPostSlugs.has(old))) {
    problems.push(
      `${where}: redirectFrom names "${old}", reserved for /writing/${old}/…`,
    );
  }
  return problems.length === before
    ? { slug, ...front.data, body: markdown.body }
    : undefined;
}

function readTags(source: string | undefined, problems: string[]): Tag[] {
  if (source === undefined) {
    problems.push(`${tagsFile} is missing`);
    return [];
  }
  let data: unknown;
  try {
    data = parseYaml(source) ?? {};
  } catch (error) {
    problems.push(
      `${tagsFile} is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
  const parsed = tagsSchema.safeParse(data);
  if (!parsed.success) {
    problems.push(
      ...issues(parsed.error).map((issue) => `${tagsFile}: ${issue}`),
    );
    return [];
  }
  return Object.entries(parsed.data).map(([slug, tag]) => ({ slug, ...tag }));
}

function readPublished(
  source: string | undefined,
  problems: string[],
): string[] {
  if (source === undefined) {
    problems.push(`${publishedFile} is missing`);
    return [];
  }
  const slugs = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (!postSlug.test(slug)) {
      problems.push(`${publishedFile}: "${slug}" is not a kebab-case slug`);
    } else if (seen.has(slug)) {
      problems.push(`${publishedFile}: "${slug}" is listed twice`);
    }
    seen.add(slug);
  }
  return [...seen];
}

function claimsOf<T extends { slug: string; redirectFrom: readonly string[] }>(
  items: readonly T[],
  live: ReadonlySet<string>,
  name: (old: string) => string,
  problems: string[],
) {
  const claims = new Map<string, string>();
  for (const item of items) {
    for (const old of item.redirectFrom) {
      const other = claims.get(old);
      if (live.has(old)) {
        problems.push(
          `${name(old)} is redirected by ${item.slug}, but is live`,
        );
      } else if (other !== undefined && other !== item.slug) {
        problems.push(
          `${name(old)} is redirected by both ${other} and ${item.slug}`,
        );
      } else {
        claims.set(old, item.slug);
      }
    }
  }
  return claims;
}

function newestFirst(a: Post, b: Post) {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  return a.slug < b.slug ? -1 : 1;
}

export function buildWriting(files: WritingFiles): Writing {
  const problems: string[] = [];
  const posts: Post[] = [];

  for (const entry of files.entries) {
    if (entry.kind === "file") {
      if (entry.name !== tagsFile && entry.name !== publishedFile) {
        problems.push(
          `${entry.name}: only post folders, ${tagsFile} and ${publishedFile} belong here`,
        );
      }
    } else if (entry.post === undefined) {
      problems.push(`${entry.name}/: a post folder holds its ${postFile}`);
    } else {
      const post = readPost(entry.name, entry.post, problems);
      if (post) {
        posts.push(post);
      }
    }
  }

  if (!files.entries.some((entry) => entry.kind === "folder")) {
    problems.push(
      "content/writing needs at least one post: the static export cannot build /writing/[slug] without one",
    );
  }

  const tags = readTags(files.tags, problems);
  const published = readPublished(files.published, problems);

  const postSlugs = new Set(posts.map(({ slug }) => slug));
  const tagSlugs = new Set(tags.map(({ slug }) => slug));
  const postClaims = claimsOf(
    posts,
    postSlugs,
    (old) => `post "${old}"`,
    problems,
  );
  const tagClaims = claimsOf(tags, tagSlugs, (old) => `tag "${old}"`, problems);

  for (const post of posts) {
    for (const tag of post.tags) {
      if (!tagSlugs.has(tag)) {
        problems.push(
          `${post.slug}/${postFile}: tag "${tag}" is not in ${tagsFile}`,
        );
      }
    }
  }
  for (const tag of tags) {
    if (!posts.some((post) => post.tags.includes(tag.slug))) {
      problems.push(
        `${tagsFile}: tag "${tag.slug}" has no posts; remove it to let its page go`,
      );
    }
  }

  const listed = new Set(published);
  for (const slug of published) {
    if (!postSlugs.has(slug) && !postClaims.has(slug)) {
      problems.push(
        `${publishedFile}: "${slug}" was published but is no post now; add it to the redirectFrom of the post it became, or remove its line to let its URL go`,
      );
    }
  }
  for (const post of posts) {
    if (!listed.has(post.slug)) {
      problems.push(
        `${publishedFile}: "${post.slug}" is missing; add it as a line of its own`,
      );
    }
  }

  if (problems.length > 0) {
    throw new WritingError(problems);
  }

  return {
    posts: posts.sort(newestFirst),
    tags: tags.sort((a, b) => a.label.localeCompare(b.label, "en")),
    redirects: [
      ...[...postClaims].map(([old, slug]) => ({
        from: postPath(old),
        to: postPath(slug),
      })),
      ...[...tagClaims].map(([old, slug]) => ({
        from: tagPath(old),
        to: tagPath(slug),
      })),
    ],
  };
}
