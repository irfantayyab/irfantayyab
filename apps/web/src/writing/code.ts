import type { Element, ElementContent } from "hast";
import { ExpressiveCode, ExpressiveCodeTheme } from "expressive-code";
import { bundledThemes } from "shiki";

const codeThemes = { dark: "one-dark-pro", light: "one-light" } as const;

export const minContrast = 4.5;

const requestedContrast = 4.6;

export const hangingIndent = 4;

export const tabWidth = 4;

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
    frames: {
      showCopyToClipboardButton: false,
      extractFileNameFromCode: false,
    },
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

function classesOf(element: Element) {
  const className = element.properties.className;
  return Array.isArray(className) ? className.map(String) : [];
}

function elementsIn(node: Element): Element[] {
  return node.children.flatMap((child) =>
    child.type === "element" ? [child, ...elementsIn(child)] : [],
  );
}

function textOf(node: Element): string {
  return node.children
    .map((child) => {
      if (child.type === "text") {
        return child.value;
      }
      return child.type === "element" ? textOf(child) : "";
    })
    .join("");
}

export function indentWidth(line: string) {
  const leading = /^[ \t]*/.exec(line)?.[0] ?? "";
  return [...leading].reduce(
    (width, char) => width + (char === "\t" ? tabWidth : 1),
    0,
  );
}

function hangLines(block: Element) {
  for (const line of elementsIn(block).filter((element) =>
    classesOf(element).includes("ec-line"),
  )) {
    const code = elementsIn(line).find((element) =>
      classesOf(element).includes("code"),
    );
    const indent = indentWidth(code ? textOf(code) : "") + hangingIndent;
    const style =
      typeof line.properties.style === "string" ? line.properties.style : "";
    line.properties.style = /--ecIndent:[^;]*/.test(style)
      ? style.replace(/--ecIndent:[^;]*/, `--ecIndent:${indent}ch`)
      : [style, `--ecIndent:${indent}ch`].filter(Boolean).join(";");
  }
}

function labelBlocks(block: Element) {
  const title = elementsIn(block)
    .filter((element) => classesOf(element).includes("title"))
    .map(textOf)
    .find((text) => text.trim() !== "");
  for (const pre of elementsIn(block).filter(
    (element) => element.tagName === "pre",
  )) {
    pre.properties.tabIndex = 0;
    pre.properties.role = "group";
    pre.properties.ariaLabel = title ? `Code: ${title}` : "Code";
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
  hangLines(renderedGroupAst);
  labelBlocks(renderedGroupAst);
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
