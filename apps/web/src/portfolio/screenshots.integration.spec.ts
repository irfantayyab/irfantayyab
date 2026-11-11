import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { imageBudget as budget } from "@/image-budget";

const srcDir = path.join(import.meta.dirname, "..");
const screenshotsDir = path.join(import.meta.dirname, "screenshots");
const imageFile = /\.(png|jpe?g|gif|webp|avif|bmp|tiff?)$/i;

async function images() {
  const entries = await readdir(srcDir, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile() && imageFile.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

describe("the images in the site's source", () => {
  it("are WebP screenshots in the screenshots folder", async () => {
    const misplaced = (await images()).filter(
      (file) =>
        path.dirname(file) !== screenshotsDir || path.extname(file) !== ".webp",
    );
    expect(
      misplaced.map((file) => path.relative(srcDir, file)),
      "images that are not WebP in src/portfolio/screenshots/",
    ).toEqual([]);
  });

  it("are each under the size budget", async () => {
    const sizes = await Promise.all(
      (await images()).map(async (file) => ({
        file: path.relative(srcDir, file),
        size: (await stat(file)).size,
      })),
    );
    expect(
      sizes.filter(({ size }) => size > budget),
      `images over ${budget / 1024} KB`,
    ).toEqual([]);
  });
});
