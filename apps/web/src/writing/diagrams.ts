import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createMermaidRenderer,
  type MermaidRenderer,
  type RenderOptions,
} from "mermaid-isomorphic";
import { pageColors } from "@/app/theme";

export type RenderedDiagram =
  { light: string; dark: string; width: number } | { error: string };

export const maxDiagramWidth = 800;

const fontFamily = '"Newsreader Variable", newsreader, Georgia, serif';

const fontCss = pathToFileURL(
  path.join(
    process.cwd(),
    "node_modules",
    "@fontsource-variable",
    "newsreader",
    "wght.css",
  ),
);

const schemes = {
  light: {
    darkMode: false,
    background: pageColors.light,
    primaryColor: "#f4f3f0",
    primaryTextColor: "#22211f",
    primaryBorderColor: "#6b6a65",
    lineColor: "#6b6a65",
    textColor: "#22211f",
  },
  dark: {
    darkMode: true,
    background: pageColors.dark,
    primaryColor: "#262522",
    primaryTextColor: "#edece8",
    primaryBorderColor: "#a3a19b",
    lineColor: "#a3a19b",
    textColor: "#edece8",
  },
} as const;

let renderer: MermaidRenderer | undefined;

function optionsFor(scheme: keyof typeof schemes): RenderOptions {
  return {
    css: fontCss,
    prefix: `diagram-${scheme}`,
    mermaidConfig: {
      theme: "base",
      fontFamily,
      htmlLabels: false,
      themeVariables: { ...schemes[scheme], fontFamily, fontSize: "16px" },
    },
  };
}

function reason(result: PromiseSettledResult<unknown> | undefined) {
  if (result?.status !== "rejected") {
    return "it did not render";
  }
  const error: unknown = result.reason;
  return error instanceof Error ? error.message : String(error);
}

export async function renderDiagrams(
  diagrams: readonly string[],
): Promise<RenderedDiagram[]> {
  renderer ??= createMermaidRenderer();
  const render = renderer;
  const [light, dark] = await Promise.all(
    (["light", "dark"] as const).map((scheme) =>
      render([...diagrams], optionsFor(scheme)),
    ),
  );
  return diagrams.map((_, index) => {
    const lightResult = light?.[index];
    const darkResult = dark?.[index];
    if (
      lightResult?.status === "fulfilled" &&
      darkResult?.status === "fulfilled"
    ) {
      return {
        light: lightResult.value.svg,
        dark: darkResult.value.svg,
        width: lightResult.value.width,
      };
    }
    return {
      error: reason(
        lightResult?.status === "rejected" ? lightResult : darkResult,
      ),
    };
  });
}
