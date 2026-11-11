import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { writingDir } from "./source";
import {
  buildWriting,
  postFile,
  type PostFile,
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

async function readPostFiles(folder: string): Promise<PostFile[]> {
  const dirents = await readdir(folder, { withFileTypes: true });
  const files = await Promise.all(
    dirents
      .filter((dirent) => dirent.name !== postFile)
      .map(async (dirent): Promise<PostFile> => {
        if (dirent.isDirectory()) {
          return { name: dirent.name, kind: "folder" };
        }
        const data = await readFile(path.join(folder, dirent.name));
        return { name: dirent.name, kind: "file", data: new Uint8Array(data) };
      }),
  );
  return files.sort((a, b) => (a.name < b.name ? -1 : 1));
}

export async function loadWritingFrom(dir: string) {
  const dirents = await readdir(dir, { withFileTypes: true });
  const entries = await Promise.all(
    dirents.map(async (dirent): Promise<WritingEntry> => {
      if (!dirent.isDirectory()) {
        return { name: dirent.name, kind: "file" };
      }
      const folder = path.join(dir, dirent.name);
      const [post, files] = await Promise.all([
        readIfThere(path.join(folder, postFile)),
        readPostFiles(folder),
      ]);
      return { name: dirent.name, kind: "folder", post, files };
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
