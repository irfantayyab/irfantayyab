import type { FeedPost } from "./feed.ts";
import {
  type ArticleImage,
  withImageMarkers,
  withPngImages,
} from "./images.ts";
import { toMarkdown } from "./markdown.ts";

export const xLimit = 280;
export const xLinkLength = 23;
export const hackerNewsTitleLimit = 80;

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const xLightRanges = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
] as const;

const emoji = /\p{RGI_Emoji}/gv;

function xWeight(character: string) {
  const code = character.codePointAt(0) ?? 0;
  return xLightRanges.some(([from, to]) => code >= from && code <= to) ? 1 : 2;
}

export function xLength(text: string) {
  const linked = text.replace(/https?:\/\/\S+/g, "x".repeat(xLinkLength));
  const emojis = linked.match(emoji)?.length ?? 0;
  return (
    emojis * 2 +
    [...linked.replace(emoji, "")].reduce(
      (length, character) => length + xWeight(character),
      0,
    )
  );
}

export function xPost(post: FeedPost) {
  const full = `${post.title}\n\n${post.description}\n\n${post.url}`;
  return xLength(full) <= xLimit ? full : `${post.title}\n\n${post.url}`;
}

export function linkedInPost(post: FeedPost) {
  return `${post.title}\n\n${post.description}\n\n${post.url}`;
}

export function originNote(post: FeedPost) {
  return `<p><em>Originally published at <a href="${escapeHtml(post.url)}">${escapeHtml(new URL(post.url).host)}</a>.</em></p>`;
}

export function hashnodeMarkdown(post: FeedPost) {
  return `${toMarkdown(post.body)}
_Originally published at [${new URL(post.url).host}](${post.url})._
`;
}

type Section = {
  id: string;
  heading: string;
  steps: readonly string[];
  fields: readonly Field[];
};

type Field =
  | { kind: "text"; label: string; value: string; note?: string }
  | { kind: "html"; label: string; html: string }
  | { kind: "image"; label: string; image: ArticleImage; data?: string };

function fieldHtml(sectionId: string, field: Field, index: number) {
  const id = `${sectionId}-${index}`;
  const button = `<button type="button" data-copy="${id}" data-kind="${field.kind}">Copy</button>`;
  if (field.kind === "image") {
    const { image } = field;
    const caption = image.caption
      ? `<p class="note">Caption: ${image.caption}</p>`
      : "";
    return `<div class="field"><div class="label">${escapeHtml(field.label)} ${button} <a href="${escapeHtml(image.src)}">PNG</a></div><p class="note">${image.alt}</p>${caption}<img class="preview" id="${id}" src="${escapeHtml(field.data ?? image.src)}" alt="${image.alt}"></div>`;
  }
  if (field.kind === "html") {
    return `<div class="field"><div class="label">${escapeHtml(field.label)} ${button}</div><div class="article" id="${id}">${field.html}</div></div>`;
  }
  const rows = Math.min(24, field.value.split("\n").length + 1);
  const note = field.note
    ? `<span class="note">${escapeHtml(field.note)}</span>`
    : "";
  return `<div class="field"><div class="label">${escapeHtml(field.label)} ${button} ${note}</div><textarea id="${id}" rows="${rows}" readonly>${escapeHtml(field.value)}</textarea></div>`;
}

function sectionHtml(section: Section) {
  const steps = section.steps.map((step) => `<li>${step}</li>`).join("");
  const fields = section.fields
    .map((field, i) => fieldHtml(section.id, field, i))
    .join("");
  return `<section id="${section.id}"><h2>${escapeHtml(section.heading)}</h2><ol>${steps}</ol>${fields}</section>`;
}

export function draftSections(
  post: FeedPost,
  imageData: ReadonlyMap<string, string> = new Map(),
) {
  const url = escapeHtml(post.url);
  const linkedIn = withImageMarkers(post.body);
  const tagLabels = post.tags.map((tag) => tag.label).join(", ");
  const x = xPost(post);
  const sections: Section[] = [
    {
      id: "medium",
      heading: "Medium",
      steps: [
        "Write a story, paste the title, then the article below it.",
        `In the story's settings, under Advanced settings, set the canonical link to <code>${url}</code>. Medium then ends the story with where it was first published.`,
        "Add the tags, then publish.",
      ],
      fields: [
        { kind: "text", label: "Title", value: post.title },
        { kind: "html", label: "Article", html: withPngImages(post.body) },
        { kind: "text", label: "Tags", value: tagLabels },
      ],
    },
    {
      id: "linkedin-article",
      heading: "LinkedIn article",
      steps: [
        "Write an article, paste the title and the article.",
        "LinkedIn drops images pasted with the article, so each one is marked <code>[Image N: …]</code>. For each, click its Copy image below, select the marker in LinkedIn and paste. If LinkedIn refuses the image, download it from its PNG link and upload it there instead. Add its caption, if it has one.",
        `Upload the card as the cover: <a href="${escapeHtml(post.card)}">${escapeHtml(post.card)}</a>. LinkedIn has no canonical link, so the article ends with the note that it was first published on the site.`,
      ],
      fields: [
        { kind: "text", label: "Title", value: post.title },
        {
          kind: "html",
          label: "Article",
          html: `${linkedIn.html}${originNote(post)}`,
        },
        ...linkedIn.images.map((image): Field => ({
          kind: "image",
          label: `Image ${image.number}`,
          image,
          ...(imageData.has(image.src)
            ? { data: imageData.get(image.src) }
            : {}),
        })),
      ],
    },
    {
      id: "linkedin-post",
      heading: "LinkedIn post",
      steps: ["Start a post and paste this. The card shows from the link."],
      fields: [{ kind: "text", label: "Post", value: linkedInPost(post) }],
    },
    {
      id: "x",
      heading: "X",
      steps: ["Post this. The card shows from the link."],
      fields: [
        {
          kind: "text",
          label: "Post",
          value: x,
          note: `${xLength(x)} of ${xLimit}`,
        },
      ],
    },
    {
      id: "reddit",
      heading: "Reddit",
      steps: [
        "Choose a subreddit that allows links to your own writing, and read its rules first.",
        "Create a link post with this title and link.",
      ],
      fields: [
        { kind: "text", label: "Title", value: post.title },
        { kind: "text", label: "Link", value: post.url },
      ],
    },
    {
      id: "hacker-news",
      heading: "Hacker News",
      steps: ["Submit this title and URL, with no text."],
      fields: [
        {
          kind: "text",
          label: "Title",
          value: post.title,
          note:
            post.title.length > hackerNewsTitleLimit
              ? `${post.title.length} characters, over the ${hackerNewsTitleLimit} Hacker News allows`
              : `${post.title.length} of ${hackerNewsTitleLimit}`,
        },
        { kind: "text", label: "URL", value: post.url },
      ],
    },
  ];
  sections.splice(1, 0, {
    id: "hashnode",
    heading: "Hashnode",
    steps: [
      "Write a new article, paste the title and the Markdown.",
      `In the article's settings, turn on republishing and set the original URL to <code>${url}</code>.`,
      `Set the cover to the card, <a href="${escapeHtml(post.card)}">${escapeHtml(post.card)}</a>, add the tags and the description, then publish.`,
    ],
    fields: [
      { kind: "text", label: "Title", value: post.title },
      { kind: "text", label: "Markdown", value: hashnodeMarkdown(post) },
      {
        kind: "text",
        label: "Tags",
        value: post.tags.map((tag) => tag.slug).join(", "),
      },
      { kind: "text", label: "Description", value: post.description },
    ],
  });
  return sections;
}

const style = `
body { font: 16px/1.5 system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; color: #222; background: #fff; }
section { border-top: 1px solid #ddd; padding-top: 1rem; margin-top: 2rem; }
.field { margin: 1rem 0; }
.label { font-weight: 600; margin-bottom: 0.25rem; }
.note { font-weight: 400; color: #666; }
textarea { width: 100%; box-sizing: border-box; font: 14px/1.4 ui-monospace, monospace; }
.article { border: 1px solid #ddd; padding: 0 1rem; max-height: 28rem; overflow: auto; }
.article img { max-width: 100%; }
.article pre { overflow: auto; background: #f6f6f6; padding: 0.5rem; }
.preview { display: block; max-width: 100%; max-height: 16rem; border: 1px solid #ddd; }
button { font: inherit; font-size: 14px; margin-left: 0.5rem; }
`;

const script = `
for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copy);
    try {
      if (button.dataset.kind === "image") {
        const blob = await (await fetch(target.src)).blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob.slice(0, blob.size, "image/png") }),
        ]);
      } else if (button.dataset.kind === "html") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([target.innerHTML], { type: "text/html" }),
            "text/plain": new Blob([target.innerText], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(target.value);
      }
      button.textContent = "Copied";
    } catch {
      button.textContent = "Copy failed";
    }
    setTimeout(() => (button.textContent = "Copy"), 2000);
  });
}
`;

export function draftsPage(
  post: FeedPost,
  imageData: ReadonlyMap<string, string> = new Map(),
) {
  const sections = draftSections(post, imageData);
  const nav = sections
    .map(
      (section) =>
        `<a href="#${section.id}">${escapeHtml(section.heading)}</a>`,
    )
    .join(" · ");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cross-posts: ${escapeHtml(post.title)}</title>
<style>${style}</style>
</head>
<body>
<h1>${escapeHtml(post.title)}</h1>
<p><a href="${escapeHtml(post.url)}">${escapeHtml(post.url)}</a></p>
<p>${nav}</p>
${sections.map(sectionHtml).join("\n")}
<script>${script}</script>
</body>
</html>
`;
}
