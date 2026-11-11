import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fontPackageDir } from "./card";
import { woffCodePoints } from "./woff-glyphs";

const woff = (name: string) =>
  readFile(
    path.join(fontPackageDir, "files", `newsreader-${name}-normal.woff`),
  );

const code = (char: string) => char.codePointAt(0) ?? -1;

describe("woffCodePoints", () => {
  it("reads the characters a font file draws", async () => {
    const latin = woffCodePoints(await woff("latin-400"));
    for (const char of "Az09 &—“”€…") {
      expect(latin.has(code(char)), char).toBe(true);
    }
    expect(latin.has(code("Ł"))).toBe(false);
  });

  it("reads another subset's characters from its own file", async () => {
    const ext = woffCodePoints(await woff("latin-ext-400"));
    expect(ext.has(code("Ł"))).toBe(true);
    expect(ext.has(code("→"))).toBe(false);
  });

  it("refuses a file that is not WOFF", () => {
    expect(() => woffCodePoints(new Uint8Array(64))).toThrow(/WOFF/);
  });
});
