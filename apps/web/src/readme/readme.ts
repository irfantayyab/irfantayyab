import { formatDate } from "@/writing/date";
import { latestPostCount } from "@/writing/writing";

export function markers(section: string) {
  return {
    start: `<!-- ${section}:start -->`,
    end: `<!-- ${section}:end -->`,
  };
}

export type ReadmePost = {
  title: string;
  url: string;
  date: string;
};

export class ReadmeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReadmeError";
  }
}

function markdownText(value: string) {
  return value.replace(/[\\`*_[\]<>]/g, (character) => `\\${character}`);
}

function markdownUrl(url: string) {
  return url.replace(
    /[()\s]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}

export function postLine(post: ReadmePost) {
  return `- [${markdownText(post.title)}](${markdownUrl(post.url)}) · ${formatDate(post.date)}`;
}

function markerLine(lines: string[], marker: string) {
  const found = lines.flatMap((line, index) =>
    line.trim() === marker ? [index] : [],
  );
  if (found.length !== 1 || found[0] === undefined) {
    throw new ReadmeError(
      `README.md must hold the line ${marker} once, and holds it ${found.length} times`,
    );
  }
  return found[0];
}

function withSection(readme: string, section: string, body: string[]) {
  const { start: startMarker, end: endMarker } = markers(section);
  const lines = readme.split("\n");
  const start = markerLine(lines, startMarker);
  const end = markerLine(lines, endMarker);
  if (end < start) {
    throw new ReadmeError(`${endMarker} comes before ${startMarker}`);
  }
  return [
    ...lines.slice(0, start + 1),
    "",
    ...body,
    "",
    ...lines.slice(end),
  ].join("\n");
}

export function withIntro(readme: string, intro: string) {
  return withSection(readme, "intro", [markdownText(intro)]);
}

export function withPosts(readme: string, posts: readonly ReadmePost[]) {
  if (posts.length === 0) {
    throw new ReadmeError("there are no posts to list");
  }
  return withSection(
    readme,
    "posts",
    posts.slice(0, latestPostCount).map(postLine),
  );
}
