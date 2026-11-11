import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { cardSize } from "./page-metadata";
import { pageColors, textColors } from "./theme";
import { woffCodePoints } from "./woff-glyphs";

const families = { latin: "Newsreader", "latin-ext": "Newsreader Ext" };

const fontFamily = Object.values(families)
  .map((name) => JSON.stringify(name))
  .join(", ");

const fontFiles = [
  { subset: "latin", weight: 400 },
  { subset: "latin-ext", weight: 400 },
  { subset: "latin", weight: 600 },
  { subset: "latin-ext", weight: 600 },
] as const;

const titleLimit = 110;

const titleSizes = [
  { upTo: 40, size: 76 },
  { upTo: 70, size: 64 },
  { upTo: Infinity, size: 54 },
];

export const fontPackageDir = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "newsreader",
);

type Fonts = {
  options: ConstructorParameters<typeof ImageResponse>[1];
  glyphs: ReadonlySet<number>;
};

let fonts: Promise<Fonts> | undefined;

async function readFonts(): Promise<Fonts> {
  const files = await Promise.all(
    fontFiles.map(async ({ subset, weight }) => ({
      name: families[subset],
      weight,
      style: "normal" as const,
      data: await readFile(
        path.join(
          fontPackageDir,
          "files",
          `newsreader-${subset}-${weight}-normal.woff`,
        ),
      ),
    })),
  );
  const weights = [...new Set(files.map(({ weight }) => weight))].map(
    (weight) =>
      new Set(
        files
          .filter((file) => file.weight === weight)
          .flatMap(({ data }) => [...woffCodePoints(data)]),
      ),
  );
  const [first = new Set<number>(), ...rest] = weights;
  return {
    options: { ...cardSize, fonts: files },
    glyphs: new Set(
      [...first].filter((code) => rest.every((set) => set.has(code))),
    ),
  };
}

export function loadFonts() {
  fonts ??= readFonts().catch((error: unknown) => {
    fonts = undefined;
    throw error;
  });
  return fonts;
}

export function fitTitle(title: string) {
  if (title.length <= titleLimit) {
    return title;
  }
  const cut = title.slice(0, titleLimit);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/u, "")}…`;
}

export function titleSize(title: string) {
  return titleSizes.find(({ upTo }) => title.length <= upTo)?.size ?? 54;
}

export function unprintable(text: string, glyphs: ReadonlySet<number>) {
  return [
    ...new Set(
      [...text].filter((char) => !glyphs.has(char.codePointAt(0) ?? -1)),
    ),
  ];
}

type Card = {
  title: string;
  subtitle: string;
  footer: string;
};

export async function renderCard({ title, subtitle, footer }: Card) {
  const { options, glyphs } = await loadFonts();
  const fitted = fitTitle(title);
  const missing = unprintable(`${fitted}${subtitle}${footer}`, glyphs);
  if (missing.length > 0) {
    throw new Error(
      `A card cannot draw ${missing.map((char) => `"${char}"`).join(", ")}: Newsreader has no glyph for it, and the renderer would fetch a font from Google`,
    );
  }
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        backgroundColor: pageColors.light,
        color: textColors.light.ink,
        fontFamily,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            fontSize: titleSize(fitted),
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {fitted}
        </div>
        <div style={{ fontSize: 36, color: textColors.light.muted }}>
          {subtitle}
        </div>
      </div>
      <div style={{ fontSize: 32, color: textColors.light.muted }}>
        {footer}
      </div>
    </div>,
    options,
  );
}
