import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { writingDir } from "./source";
import {
  buildWriting,
  postFile,
  publishedFile,
  tagsFile,
  type WritingEntry,
} from "./writing";

async function readIfThere(file: string) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function loadWritingFrom(dir: string) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const entries = await Promise.all(
    dirents.map(async (dirent): Promise<WritingEntry> => {
      if (!dirent.isDirectory()) {
        return { name: dirent.name, kind: "file" };
      }
      const post = await readIfThere(path.join(dir, dirent.name, postFile));
      return { name: dirent.name, kind: "folder", post };
    }),
  );
  const [tags, published] = await Promise.all([
    readIfThere(path.join(dir, tagsFile)),
    readIfThere(path.join(dir, publishedFile)),
  ]);
  return buildWriting({
    entries: entries.sort((a, b) => (a.name < b.name ? -1 : 1)),
    tags,
    published,
  });
}

export const loadWriting = cache(() => loadWritingFrom(writingDir));
