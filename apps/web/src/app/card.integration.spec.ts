import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fontPackageDir, loadFonts, renderCard, unprintable } from "./card";

describe("the card's fonts", () => {
  it("draw the Latin text and punctuation a title uses", async () => {
    const { glyphs } = await loadFonts();
    expect(
      unprintable("Café, naïve — “quoted” · 10 € – Łódź… Next.js™", glyphs),
    ).toEqual([]);
  });

  it("lack the characters their subsets leave out", async () => {
    const { glyphs } = await loadFonts();
    expect(unprintable("→ ạ ‐ 世 🚀", glyphs)).toEqual([
      "→",
      "ạ",
      "‐",
      "世",
      "🚀",
    ]);
  });

  it("are the same version as the site's variable font", async () => {
    const version = async (dir: string) =>
      (
        JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as {
          version: string;
        }
      ).version;
    expect(await version(fontPackageDir)).toBe(
      await version(
        path.join(
          process.cwd(),
          "node_modules",
          "@fontsource-variable",
          "newsreader",
        ),
      ),
    );
  });
});

describe("renderCard", () => {
  it("refuses text the font cannot draw, before the renderer would fetch a font", async () => {
    await expect(
      renderCard({ title: "From LaTeX → PDF", subtitle: "", footer: "" }),
    ).rejects.toThrow(/"→"/);
  });

  it("draws a 1200 by 630 PNG", async () => {
    const response = await renderCard({
      title: "Holding a portfolio to its resume",
      subtitle: "11 Nov 2026",
      footer: "Irfan Tayyab · Full-Stack AI Engineer",
    });
    const png = Buffer.from(await response.arrayBuffer());
    expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });
});
