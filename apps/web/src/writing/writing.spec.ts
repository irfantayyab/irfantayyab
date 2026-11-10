import { describe, expect, it } from "vitest";
import { webpHeader } from "@/testing/webp";
import {
  buildWriting,
  type PostFile,
  type WritingEntry,
  WritingError,
  type WritingFiles,
} from "./writing";

type Front = Record<string, string | readonly string[] | undefined>;

function yamlValue(value: string | readonly string[]) {
  return typeof value === "string"
    ? JSON.stringify(value)
    : `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
}

function post(front: Front, body = "Some text.") {
  const lines = Object.entries(front)
    .filter((entry): entry is [string, string | readonly string[]] =>
      Boolean(entry[1]),
    )
    .map(([key, value]) => `${key}: ${yamlValue(value)}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}\n`;
}

const base = {
  title: "A post",
  date: "2026-11-10",
  description: "What the post is about.",
  tags: ["ai"],
};

function folder(name: string, front: Front = {}, body?: string): WritingEntry {
  return { name, kind: "folder", post: post({ ...base, ...front }, body) };
}

function files(overrides: Partial<WritingFiles> = {}): WritingFiles {
  return {
    entries: [folder("first-post", { tags: ["ai"] })],
    tags: "ai:\n  label: AI\n",
    published: "first-post\n",
    ...overrides,
  };
}

function problemsOf(input: WritingFiles) {
  try {
    buildWriting(input);
  } catch (error) {
    if (error instanceof WritingError) {
      return error.problems;
    }
    throw error;
  }
  return [];
}

function expectProblem(input: WritingFiles, pattern: RegExp) {
  expect(problemsOf(input)).toEqual(
    expect.arrayContaining([expect.stringMatching(pattern)]),
  );
}

describe("buildWriting", () => {
  it("reads posts, tags and their front matter", () => {
    const writing = buildWriting(files());
    expect(writing.posts).toHaveLength(1);
    expect(writing.posts[0]).toMatchObject({
      slug: "first-post",
      ...base,
      tags: ["ai"],
      redirectFrom: [],
    });
    expect(writing.tags).toEqual([
      { slug: "ai", label: "AI", redirectFrom: [] },
    ]);
    expect(writing.redirects).toEqual([]);
  });

  it("requires at least one post, or the export cannot build", () => {
    expectProblem(
      { entries: [], tags: "", published: "" },
      /needs at least one post/,
    );
  });

  it("sorts posts newest first, then by slug", () => {
    const writing = buildWriting(
      files({
        entries: [
          folder("b-post", { date: "2026-11-01" }),
          folder("old-post", { date: "2026-01-01" }),
          folder("a-post", { date: "2026-11-01", tags: ["ai"] }),
        ],
        published: "old-post\na-post\nb-post\n",
      }),
    );
    expect(writing.posts.map(({ slug }) => slug)).toEqual([
      "a-post",
      "b-post",
      "old-post",
    ]);
  });

  it("renders the body to an HTML tree with heading ids", () => {
    const writing = buildWriting(
      files({
        entries: [folder("first-post", { tags: ["ai"] }, "## A heading")],
      }),
    );
    expect(writing.posts[0]?.body.children).toContainEqual(
      expect.objectContaining({
        tagName: "h2",
        properties: { id: "a-heading" },
      }),
    );
  });

  it("reports every problem at once", () => {
    const problems = problemsOf(
      files({
        entries: [
          folder("first-post", { tags: ["ai"], title: "" }),
          folder("Bad_Name", { tags: ["ai"] }),
        ],
        published: "first-post\nBad_Name\n",
      }),
    );
    expect(problems.length).toBeGreaterThanOrEqual(3);
  });

  describe("front matter", () => {
    it("requires a title, a date and a description", () => {
      const problems = problemsOf(
        files({
          entries: [{ name: "first-post", kind: "folder", post: "Text." }],
        }),
      );
      for (const field of ["title", "date", "description"]) {
        expect(problems).toEqual(
          expect.arrayContaining([expect.stringContaining(field)]),
        );
      }
    });

    it("rejects an unknown field, such as a misspelt one", () => {
      expectProblem(
        files({ entries: [folder("first-post", { tags: ["ai"], tag: "ai" })] }),
        /first-post\/index\.md: .*tag/,
      );
    });

    it("rejects a date not written as YYYY-MM-DD", () => {
      expectProblem(
        files({
          entries: [folder("first-post", { tags: ["ai"], date: "10/11/2026" })],
        }),
        /date/,
      );
    });

    it("rejects an updated date before the date", () => {
      expectProblem(
        files({
          entries: [
            folder("first-post", { tags: ["ai"], updated: "2026-01-01" }),
          ],
        }),
        /updated \(2026-01-01\) is before date/,
      );
    });

    it("rejects front matter that is not valid YAML", () => {
      expectProblem(
        files({
          entries: [
            {
              name: "first-post",
              kind: "folder",
              post: "---\ntitle: [unclosed\n---\n\nText.\n",
            },
          ],
        }),
        /not valid YAML/,
      );
    });
  });

  describe("the body", () => {
    it.each([
      ["raw HTML", "<div>Hi</div>", /line \d+: raw HTML/],
      ["a level-1 heading", "# Another title", /level-1 heading/],
    ])("rejects %s", (_, body, pattern) => {
      expectProblem(
        files({ entries: [folder("first-post", { tags: ["ai"] }, body)] }),
        pattern,
      );
    });
  });

  describe("images", () => {
    const catBody = '![A cat](cat.webp "Asleep")';

    function withFiles(
      postFiles: readonly PostFile[],
      body = catBody,
    ): WritingFiles {
      return files({
        entries: [
          {
            name: "first-post",
            kind: "folder",
            post: post(base, body),
            files: postFiles,
          },
        ],
      });
    }

    const cat: PostFile = {
      name: "cat.webp",
      kind: "file",
      data: webpHeader(1200, 800),
    };

    it("serves each image from the post's address, with its size", () => {
      const [first] = buildWriting(withFiles([cat])).posts;
      expect(first?.images).toEqual([
        { file: "cat.webp", data: cat.data, width: 1200, height: 800 },
      ]);
      expect(first?.body.children).toContainEqual(
        expect.objectContaining({
          tagName: "figure",
          children: expect.arrayContaining([
            expect.objectContaining({
              tagName: "img",
              properties: {
                src: "/writing/first-post/cat.webp",
                alt: "A cat",
                width: 1200,
                height: 800,
                loading: "lazy",
                decoding: "async",
              },
            }),
          ]),
        }),
      );
    });

    it("fails an image that is not in the folder", () => {
      expectProblem(
        withFiles([]),
        /first-post\/index\.md: line \d+: image "cat\.webp" is not in the post's folder/,
      );
    });

    it("fails a file the post does not use", () => {
      expectProblem(
        withFiles([cat, { ...cat, name: "dog.webp" }]),
        /first-post\/dog\.webp: the post does not use it/,
      );
    });

    it("fails a file that is not a WebP named in kebab case", () => {
      expectProblem(
        withFiles([cat, { ...cat, name: "notes.txt" }]),
        /first-post\/notes\.txt: a post folder holds only its index\.md and WebP images/,
      );
    });

    it("fails a folder inside a post's folder", () => {
      expectProblem(
        withFiles([cat, { name: "drafts", kind: "folder" }]),
        /first-post\/drafts\/: a post folder holds no folders/,
      );
    });

    it("fails a file named .webp that is not a WebP", () => {
      expectProblem(
        withFiles([{ ...cat, data: new Uint8Array([1, 2, 3]) }]),
        /first-post\/cat\.webp: is not a WebP image/,
      );
    });

    it("fails an image over the budget", () => {
      expectProblem(
        withFiles([{ ...cat, data: webpHeader(1200, 800, 150 * 1024 + 1) }]),
        /first-post\/cat\.webp: 151 KB is over the 150 KB budget/,
      );
    });

    it("takes an image at the budget", () => {
      expect(
        problemsOf(
          withFiles([{ ...cat, data: webpHeader(1200, 800, 150 * 1024) }]),
        ),
      ).toEqual([]);
    });
  });

  describe("folders and files", () => {
    it("requires a kebab-case folder name", () => {
      expectProblem(
        files({
          entries: [folder("First_Post", { tags: ["ai"] })],
          published: "first-post\n",
        }),
        /First_Post\/: .*kebab case/,
      );
    });

    it("refuses a reserved slug as a folder name", () => {
      expectProblem(
        files({
          entries: [...files().entries, folder("tags")],
          published: "first-post\ntags\n",
        }),
        /tags\/: "tags" is reserved/,
      );
    });

    it("refuses a reserved slug in redirectFrom", () => {
      expectProblem(
        files({ entries: [folder("first-post", { redirectFrom: ["tags"] })] }),
        /redirectFrom names "tags", reserved/,
      );
    });

    it("requires each post folder to hold its index.md", () => {
      expectProblem(
        files({
          entries: [...files().entries, { name: "empty-post", kind: "folder" }],
        }),
        /empty-post\/: a post folder holds its index\.md/,
      );
    });

    it("rejects a stray file", () => {
      expectProblem(
        files({
          entries: [...files().entries, { name: "notes.md", kind: "file" }],
        }),
        /notes\.md: only post folders/,
      );
    });

    it("requires tags.yaml and published.txt", () => {
      const problems = problemsOf({ entries: files().entries });
      expect(problems).toEqual(
        expect.arrayContaining([
          "tags.yaml is missing",
          "published.txt is missing",
        ]),
      );
    });
  });

  describe("tags", () => {
    it("allows at most four tags", () => {
      expectProblem(
        files({
          entries: [folder("first-post", { tags: ["a", "b", "c", "d", "e"] })],
          tags: "a: {label: A}\nb: {label: B}\nc: {label: C}\nd: {label: D}\ne: {label: E}\n",
        }),
        /tags/,
      );
    });

    it("requires at least one tag on a post", () => {
      expectProblem(
        files({ entries: [folder("first-post", { tags: [] })] }),
        /a post has at least one tag/,
      );
    });

    it("allows only tags from the vocabulary", () => {
      expectProblem(
        files({ entries: [folder("first-post", { tags: ["ai", "llm"] })] }),
        /tag "llm" is not in tags\.yaml/,
      );
    });

    it("rejects a tag listed twice on a post", () => {
      expectProblem(
        files({ entries: [folder("first-post", { tags: ["ai", "ai"] })] }),
        /tag "ai" is listed twice/,
      );
    });

    it("rejects a tag slug that is not a-z and 0-9", () => {
      expectProblem(
        files({
          entries: [folder("first-post", { tags: ["full-stack"] })],
          tags: "full-stack:\n  label: Full-Stack\n",
        }),
        /a tag is a slug of a-z and 0-9/,
      );
    });

    it("rejects a tag that no post uses", () => {
      expectProblem(
        files({ tags: "ai:\n  label: AI\nweb:\n  label: Web\n" }),
        /tag "web" has no posts/,
      );
    });

    it("rejects a tag without a label", () => {
      expectProblem(files({ tags: "ai: {}\n" }), /tags\.yaml: ai\.label/);
    });

    it("redirects a renamed tag", () => {
      const writing = buildWriting(
        files({ tags: "ai:\n  label: AI\n  redirectFrom: [ml]\n" }),
      );
      expect(writing.redirects).toEqual([
        { from: "/writing/tags/ml", to: "/writing/tags/ai" },
      ]);
    });

    it("rejects redirecting a tag that is live", () => {
      expectProblem(
        files({
          entries: [folder("first-post", { tags: ["ai", "ml"] })],
          tags: "ai:\n  label: AI\n  redirectFrom: [ml]\nml:\n  label: ML\n",
        }),
        /tag "ml" is redirected by ai, but is live/,
      );
    });
  });

  describe("published URLs", () => {
    it("redirects a renamed post that keeps its old slug", () => {
      const writing = buildWriting(
        files({
          entries: [
            folder("new-name", { tags: ["ai"], redirectFrom: ["old-name"] }),
          ],
          published: "old-name\nnew-name\n",
        }),
      );
      expect(writing.redirects).toEqual([
        { from: "/writing/old-name", to: "/writing/new-name" },
      ]);
    });

    it("fails a renamed post that forgot its old slug", () => {
      expectProblem(
        files({
          entries: [folder("new-name", { tags: ["ai"] })],
          published: "old-name\nnew-name\n",
        }),
        /"old-name" was published but is no post now/,
      );
    });

    it("fails a deleted post until its line is removed", () => {
      expectProblem(
        files({ published: "first-post\ngone-post\n" }),
        /"gone-post" was published but is no post now/,
      );
    });

    it("fails a post that is not listed", () => {
      expectProblem(
        files({ published: "" }),
        /"first-post" is missing; add it/,
      );
    });

    it("rejects a slug listed twice or not in kebab case", () => {
      const problems = problemsOf(
        files({ published: "first-post\nfirst-post\nNot A Slug\n" }),
      );
      expect(problems).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/"first-post" is listed twice/),
          expect.stringMatching(/"Not A Slug" is not a kebab-case slug/),
        ]),
      );
    });

    it("rejects redirecting a slug that is a live post", () => {
      expectProblem(
        files({
          entries: [
            folder("first-post", { tags: ["ai"] }),
            folder("second-post", { redirectFrom: ["first-post"] }),
          ],
          published: "first-post\nsecond-post\n",
        }),
        /post "first-post" is redirected by second-post, but is live/,
      );
    });

    it("rejects an old slug claimed by two posts", () => {
      expectProblem(
        files({
          entries: [
            folder("a-post", { tags: ["ai"], redirectFrom: ["old-post"] }),
            folder("b-post", { redirectFrom: ["old-post"] }),
          ],
          published: "old-post\na-post\nb-post\n",
        }),
        /post "old-post" is redirected by both a-post and b-post/,
      );
    });

    it("rejects a post redirecting from its own slug", () => {
      expectProblem(
        files({
          entries: [
            folder("first-post", {
              tags: ["ai"],
              redirectFrom: ["first-post"],
            }),
          ],
        }),
        /redirectFrom names the post's own slug/,
      );
    });
  });
});
