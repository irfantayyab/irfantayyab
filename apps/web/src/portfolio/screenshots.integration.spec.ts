import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const screenshotsDir = path.join(import.meta.dirname, "screenshots");
const budget = 150 * 1024;

async function screenshots() {
  try {
    return await readdir(screenshotsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

describe("the project screenshots", () => {
  it("are WebP files under the size budget", async () => {
    const files = await screenshots();
    const sizes = await Promise.all(
      files.map(async (file) => ({
        file,
        size: (await stat(path.join(screenshotsDir, file))).size,
      })),
    );
    expect(
      files.filter((file) => path.extname(file) !== ".webp"),
      "screenshots that are not WebP",
    ).toEqual([]);
    expect(
      sizes.filter(({ size }) => size > budget),
      `screenshots over ${budget / 1024} KB`,
    ).toEqual([]);
  });
});
