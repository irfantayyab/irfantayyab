import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const source = join(root, "content", "writing");
const target = join(root, "apps", "web", "public", "writing");

rmSync(target, { recursive: true, force: true });

for (const post of readdirSync(source, { withFileTypes: true })) {
  if (!post.isDirectory()) {
    continue;
  }
  for (const file of readdirSync(join(source, post.name))) {
    if (file.endsWith(".webp")) {
      mkdirSync(join(target, post.name), { recursive: true });
      cpSync(join(source, post.name, file), join(target, post.name, file));
    }
  }
}
