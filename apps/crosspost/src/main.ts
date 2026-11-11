import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDir, envFile, parseOptions, run } from "./cli.ts";
import { devToClient } from "./devto.ts";
import { draftsPage } from "./drafts.ts";
import { readFeed } from "./feed.ts";
import { imageData, withImageMarkers } from "./images.ts";

try {
  const options = parseOptions(process.argv.slice(2));
  process.exitCode = await run(options, {
    readFeed: (source) => readFeed(source),
    postToDevTo: (post, publish) => {
      const apiKey = process.env.DEV_TO_API_KEY;
      if (!apiKey) {
        throw new Error(`DEV_TO_API_KEY is not set in ${envFile}`);
      }
      return devToClient(apiKey).post(post, publish);
    },
    writeDrafts: async (post) => {
      const folder = path.join(dataDir, "crossposts", post.slug);
      await mkdir(folder, { recursive: true });
      const file = path.join(folder, "index.html");
      const { images } = withImageMarkers(post.body);
      const data = await imageData(images.map((image) => image.src));
      await writeFile(file, draftsPage(post, data));
      return file;
    },
    log: (line) => console.log(line),
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
