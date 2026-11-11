import type { Element, ElementContent } from "hast";
import { ExpressiveCode, ExpressiveCodeTheme } from "expressive-code";
import { bundledThemes } from "shiki";

export const codeThemes = { dark: "one-dark-pro", light: "one-light" } as const;

export const minContrast = 4.5;

const requestedContrast = 4.6;

export const hangingIndent = 4;

async function loadTheme(name: keyof typeof bundledThemes) {
  const theme = await bundledThemes[name]();
  return new ExpressiveCodeTheme(theme.default);
}

async function createEngine() {
  return new ExpressiveCode({
    themes: [
      await loadTheme(codeThemes.dark),
      await loadTheme(codeThemes.light),
    ],
    themeCssSelector: false,
    useDarkModeMediaQuery: true,
    minSyntaxHighlightingColorContrast: requestedContrast,
    frames: { showCopyToClipboardButton: false },
    defaultProps: { wrap: true, preserveIndent: true, hangingIndent },
    styleOverrides: {
      borderRadius: "0.375rem",
      borderWidth: "1px",
      codeFontFamily: "var(--font-mono)",
      codeFontSize: "0.875rem",
      codeLineHeight: "1.6",
      uiFontFamily: "var(--font-sans)",
      uiFontSize: "0.875rem",
      frames: { frameBoxShadowCssValue: "none" },
    },
  });
}

let engine: Promise<ExpressiveCode> | undefined;

function getEngine() {
  engine ??= createEngine().catch((error: unknown) => {
    engine = undefined;
    throw error;
  });
  return engine;
}

function scrollable(node: Element) {
  for (const child of node.children) {
    if (child.type !== "element") {
      continue;
    }
    if (child.tagName === "pre") {
      child.properties.tabIndex = 0;
    } else {
      scrollable(child);
    }
  }
}

export async function renderCode(
  code: string,
  language: string,
  meta: string,
): Promise<ElementContent[]> {
  const ec = await getEngine();
  const { renderedGroupAst, styles } = await ec.render({
    code,
    language,
    meta,
  });
  scrollable(renderedGroupAst);
  return styles.size > 0
    ? [
        {
          type: "element",
          tagName: "style",
          properties: {},
          children: [{ type: "text", value: [...styles].join("") }],
        },
        renderedGroupAst,
      ]
    : [renderedGroupAst];
}

export async function codeStyles() {
  const ec = await getEngine();
  return `${await ec.getBaseStyles()}${await ec.getThemeStyles()}`;
}

export async function codeBackgrounds() {
  const ec = await getEngine();
  const [dark, light] = ec.styleVariants.map(({ theme }) => theme.bg);
  return { dark: dark ?? "", light: light ?? "" };
}
