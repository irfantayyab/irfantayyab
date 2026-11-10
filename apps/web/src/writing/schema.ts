import { z } from "zod";

export const postSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const tagSlug = /^[a-z0-9]+$/;

export const imageFile = /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/;

export const plainLanguages: ReadonlySet<string> = new Set([
  "text",
  "txt",
  "plaintext",
]);

export const maxTags = 4;

export const reservedPostSlugs: ReadonlySet<string> = new Set(["tags"]);

const text = z.string().trim().min(1);
const day = z.iso.date();

export const frontMatterSchema = z.strictObject({
  title: text,
  date: day,
  description: text,
  updated: day.optional(),
  tags: z
    .array(z.string().regex(tagSlug, "a tag is a slug of a-z and 0-9"))
    .min(1, "a post has at least one tag, so every tag page has a post")
    .max(maxTags),
  redirectFrom: z
    .array(z.string().regex(postSlug, "an old slug is kebab case"))
    .default([]),
});

export const tagsSchema = z.record(
  z.string().regex(tagSlug, "a tag is a slug of a-z and 0-9"),
  z.strictObject({
    label: text,
    redirectFrom: z
      .array(z.string().regex(tagSlug, "an old tag is a slug of a-z and 0-9"))
      .default([]),
  }),
);

export function issues(error: z.ZodError) {
  return error.issues.map((issue) =>
    issue.path.length > 0
      ? `${issue.path.join(".")}: ${issue.message}`
      : issue.message,
  );
}
