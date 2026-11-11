import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { cardSize } from "./page-metadata";
import { lightText, pageColors } from "./theme";

const fontFamily = "Newsreader";

const fontFiles = [
  { subset: "latin", weight: 400 },
  { subset: "latin-ext", weight: 400 },
  { subset: "latin", weight: 600 },
  { subset: "latin-ext", weight: 600 },
] as const;

const printable = /^[ -ɏḀ-ỿ -⁯₠-⃏™←-↓−∕]*$/u;

const titleLimit = 110;

const titleSizes = [
  { upTo: 40, size: 76 },
  { upTo: 70, size: 64 },
  { upTo: Infinity, size: 54 },
];

let fonts: Promise<ConstructorParameters<typeof ImageResponse>[1]> | undefined;

function loadFonts() {
  fonts ??= Promise.all(
    fontFiles.map(async ({ subset, weight }) => ({
      name: fontFamily,
      weight,
      style: "normal" as const,
      data: await readFile(
        path.join(
          process.cwd(),
          "node_modules",
          "@fontsource",
          "newsreader",
          "files",
          `newsreader-${subset}-${weight}-normal.woff`,
        ),
      ),
    })),
  ).then((files) => ({ ...cardSize, fonts: files }));
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

export function unprintable(text: string) {
  return [...text].filter((char) => !printable.test(char));
}

type Card = {
  title: string;
  subtitle: string;
  footer: string;
};

export async function renderCard({ title, subtitle, footer }: Card) {
  const missing = unprintable(`${title}${subtitle}${footer}`);
  if (missing.length > 0) {
    throw new Error(
      `A card cannot draw ${missing.map((char) => `"${char}"`).join(", ")}: Newsreader has no glyph for it, and the renderer would fetch a font from Google`,
    );
  }
  const fitted = fitTitle(title);
  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        backgroundColor: pageColors.light,
        color: lightText.ink,
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
        <div style={{ fontSize: 36, color: lightText.muted }}>{subtitle}</div>
      </div>
      <div style={{ fontSize: 32, color: lightText.muted }}>{footer}</div>
    </div>,
    await loadFonts(),
  );
  return new Response(await image.arrayBuffer(), {
    headers: { "Content-Type": "image/png" },
  });
}
