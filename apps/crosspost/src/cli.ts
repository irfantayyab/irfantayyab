import path from "node:path";
import { parseArgs } from "node:util";
import { productionUrl } from "../../web/src/production-url.ts";
import type { DevToResult } from "./devto.ts";
import { findPost, isWorkersDev, type FeedPost } from "./feed.ts";

export const targets = ["devto", "drafts"] as const;

export type Target = (typeof targets)[number];

export type Options = {
  slug: string;
  feed: string;
  publish: boolean;
  only: readonly Target[];
};

export const productionFeed = `${productionUrl}/feed.xml`;

export const dataDir = path.join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "portfolio-data",
);

export const envFile = path.join(dataDir, "crosspost.env");

export const usage = `Usage: pnpm crosspost <slug> [--feed <url or file>] [--publish] [--only ${targets.join(",")}]`;

export class UsageError extends Error {
  constructor(message: string) {
    super(`${message}\n${usage}`);
    this.name = "UsageError";
  }
}

export function feedSource(value: string | undefined) {
  if (value === undefined) {
    return productionFeed;
  }
  return /^https?:\/\//.test(value)
    ? value
    : path.resolve(process.env.INIT_CWD ?? process.cwd(), value);
}

export function parseOptions(argv: readonly string[]): Options {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        feed: { type: "string" },
        publish: { type: "boolean", default: false },
        only: { type: "string" },
      },
    });
  } catch (error) {
    throw new UsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
  const [slug, ...rest] = parsed.positionals;
  if (!slug || rest.length > 0) {
    throw new UsageError("Name one post by its slug.");
  }
  const only = parsed.values.only
    ? parsed.values.only.split(",").map((name) => name.trim())
    : [...targets];
  for (const name of only) {
    if (!targets.includes(name as Target)) {
      throw new UsageError(`"${name}" is not one of ${targets.join(", ")}.`);
    }
  }
  return {
    slug,
    feed: feedSource(parsed.values.feed),
    publish: parsed.values.publish,
    only: only as Target[],
  };
}

export type Dependencies = {
  readFeed: (source: string) => Promise<FeedPost[]>;
  postToDevTo: (post: FeedPost, publish: boolean) => Promise<DevToResult>;
  writeDrafts: (post: FeedPost) => Promise<string>;
  log: (line: string) => void;
};

export async function run(options: Options, deps: Dependencies) {
  const post = findPost(await deps.readFeed(options.feed), options.slug);
  if (options.publish && isWorkersDev(post.url)) {
    throw new UsageError(
      `--publish is refused while the post lives at ${new URL(post.url).host}: its canonical link would point there for good. Drafts only until the domain is live.`,
    );
  }
  let failed = false;
  for (const target of options.only) {
    try {
      if (target === "devto") {
        const result = await deps.postToDevTo(post, options.publish);
        deps.log(
          `dev.to: ${result.action} ${result.published ? "the published article" : "a draft"}, ${result.url}`,
        );
      } else {
        deps.log(`drafts: ${await deps.writeDrafts(post)}`);
      }
    } catch (error) {
      failed = true;
      deps.log(
        `${target}: failed, ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return failed ? 1 : 0;
}
