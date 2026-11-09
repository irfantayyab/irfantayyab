import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = path.join(import.meta.dirname, "..");
const screenshotsDir = path.join(import.meta.dirname, "screenshots");
const budget = 150 * 1024;
const imageFile = /\.(png|jpe?g|gif|webp|avif|bmp|tiff?)$/i;

async function images() {
  const files = await readdir(srcDir, { recursive: true, encoding: "utf8" });
  return files
    .filter((file) => imageFile.test(file))
    .map((file) => path.join(srcDir, file));
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
