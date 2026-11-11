import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fontPackageDir, loadFonts, renderCard, unprintable } from "./card";
import { woffCodePoints } from "./woff-glyphs";

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

  it("all carry the same combining marks, since a letter and its accents are drawn from one file", async () => {
    const { options } = await loadFonts();
    const files = options?.fonts ?? [];
    expect(files.length).toBeGreaterThan(1);
    const marks = files.map(({ name, weight, data }) => ({
      file: `${name} ${weight}`,
      marks: [...woffCodePoints(new Uint8Array(data))]
        .filter((code) => code >= 0x300 && code <= 0x36f)
        .sort((a, b) => a - b),
    }));
    const [first] = marks;
    expect(first?.marks.length).toBeGreaterThan(0);
    for (const { file, marks: own } of marks) {
      expect(own, file).toEqual(first?.marks);
    }
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

  it("draws every letter it accepts from its own fonts, fetching none", async () => {
    const fetched: string[] = [];
    const realFetch = globalThis.fetch;
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url =
          input instanceof Request ? input.url : new URL(String(input)).href;
        fetched.push(url);
        return url.startsWith("data:")
          ? realFetch(input, init)
          : Promise.reject(new Error(`A card fetched ${url}`));
      });
    try {
      const response = await renderCard({
        title: "Łódź, Kraków and Gdańsk",
        subtitle: "Łódź, ő, ș, ğ",
        footer: "Irfan Tayyab · Full-Stack AI Engineer",
      });
      await response.arrayBuffer();
    } finally {
      spy.mockRestore();
    }
    expect(fetched.filter((url) => !url.startsWith("data:"))).toEqual([]);
  });
});
