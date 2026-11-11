import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  feedSource,
  parseOptions,
  productionFeed,
  run,
  targets,
  UsageError,
  type Dependencies,
} from "./cli.ts";
import { feedPost } from "./testing/post.ts";

describe("feedSource", () => {
  it("reads a feed's path from the folder the command was typed in", () => {
    const before = process.env.INIT_CWD;
    process.env.INIT_CWD = path.resolve("/typed/here");
    try {
      expect(feedSource("out/feed.xml")).toBe(
        path.resolve("/typed/here", "out/feed.xml"),
      );
      expect(feedSource("https://b.dev/feed.xml")).toBe(
        "https://b.dev/feed.xml",
      );
      expect(feedSource(undefined)).toBe(productionFeed);
    } finally {
      if (before === undefined) {
        delete process.env.INIT_CWD;
      } else {
        process.env.INIT_CWD = before;
      }
    }
  });
});

describe("parseOptions", () => {
  it("reads the production feed and every target by default, as drafts", () => {
    expect(parseOptions(["a-post"])).toEqual({
      slug: "a-post",
      feed: productionFeed,
      publish: false,
      only: [...targets],
    });
  });

  it("takes another feed, publishing and a choice of targets", () => {
    expect(
      parseOptions([
        "a-post",
        "--feed",
        "https://b.dev/feed.xml",
        "--publish",
        "--only",
        "drafts",
      ]),
    ).toEqual({
      slug: "a-post",
      feed: "https://b.dev/feed.xml",
      publish: true,
      only: ["drafts"],
    });
  });

  it.each([[[]], [["a", "b"]], [["a", "--only", "medium"]], [["a", "--x"]]])(
    "refuses %j",
    (argv) => {
      expect(() => parseOptions(argv)).toThrow(UsageError);
    },
  );
});

const workersDevUrl =
  "https://portfolio.irfantayyab.workers.dev/writing/a-post";

function deps(overrides: Partial<Dependencies> = {}) {
  const lines: string[] = [];
  const dependencies: Dependencies = {
    readFeed: async () => [feedPost({ url: workersDevUrl })],
    postToDevTo: async (_, publish) => ({
      url: "https://dev.to/me/a-post",
      action: "created",
      published: publish,
    }),
    writeDrafts: async () => "/data/crossposts/a-post/index.html",
    log: (line) => lines.push(line),
    ...overrides,
  };
  return { lines, dependencies };
}

describe("run", () => {
  it("posts a draft and writes the drafts page", async () => {
    const { lines, dependencies } = deps();
    expect(await run(parseOptions(["a-post"]), dependencies)).toBe(0);
    expect(lines).toEqual([
      "dev.to: created a draft, https://dev.to/me/a-post",
      "drafts: /data/crossposts/a-post/index.html",
    ]);
  });

  it("refuses to publish a post that lives on workers.dev", async () => {
    const { lines, dependencies } = deps();
    await expect(
      run(parseOptions(["a-post", "--publish"]), dependencies),
    ).rejects.toThrow(
      /--publish is refused while the post lives at portfolio\.irfantayyab\.workers\.dev/,
    );
    expect(lines).toEqual([]);
  });

  it("publishes a post on its own domain", async () => {
    const { lines, dependencies } = deps({
      readFeed: async () => [feedPost()],
    });
    expect(await run(parseOptions(["a-post", "--publish"]), dependencies)).toBe(
      0,
    );
    expect(lines[0]).toBe(
      "dev.to: created the published article, https://dev.to/me/a-post",
    );
  });

  it("goes on to the next target when one fails, and fails at the end", async () => {
    const { lines, dependencies } = deps({
      postToDevTo: async () => {
        throw new Error("DEV_TO_API_KEY is not set");
      },
    });
    expect(await run(parseOptions(["a-post"]), dependencies)).toBe(1);
    expect(lines).toEqual([
      "devto: failed, DEV_TO_API_KEY is not set",
      "drafts: /data/crossposts/a-post/index.html",
    ]);
  });
});
