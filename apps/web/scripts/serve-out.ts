import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Page, Route } from "playwright";
import { siteUrl } from "../src/site.ts";

export const outDir = path.join(import.meta.dirname, "..", "out");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function isFile(file: string) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function fileFor(pathname: string) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const candidates = decoded.endsWith("/")
    ? [`${decoded}index.html`]
    : [decoded, `${decoded}.html`, `${decoded}/index.html`];
  for (const candidate of candidates) {
    const file = path.join(outDir, candidate);
    if (file.startsWith(outDir + path.sep) && (await isFile(file))) {
      return file;
    }
  }
  return undefined;
}

export async function serveOut(context: BrowserContext) {
  const missing: string[] = [];
  const foreign: string[] = [];
  await context.route("**/*", async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.origin !== siteUrl) {
      foreign.push(url.href);
      await route.abort("blockedbyclient");
      return;
    }
    const file = await fileFor(url.pathname);
    if (!file) {
      missing.push(url.pathname);
      await route.fulfill({ status: 404 });
      return;
    }
    await route.fulfill({
      body: await readFile(file),
      contentType:
        contentTypes[path.extname(file)] ?? "application/octet-stream",
    });
  });
  return () => [
    ...missing.map((pathname) => `${pathname} is not in out/`),
    ...foreign.map((href) => `${href} is not on ${siteUrl}`),
  ];
}

export async function openFromOut(page: Page, pathname: string) {
  const response = await page.goto(`${siteUrl}${pathname}`, {
    waitUntil: "load",
  });
  if (!response?.ok()) {
    throw new Error(
      `${pathname} did not load from out/: ${response?.status() ?? "no response"}`,
    );
  }
  await page.evaluate(() => document.fonts.ready);
}

export async function loadProblems(page: Page) {
  const broken = await page.evaluate(() =>
    [...document.images]
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
  );
  const fonts = await page.evaluate(() => {
    const faces = [...document.fonts].filter(
      (font) => !font.family.endsWith(" Fallback"),
    );
    return {
      failed: faces
        .filter((font) => font.status === "error")
        .map((font) => font.family),
      loaded: faces.some((font) => font.status === "loaded"),
    };
  });
  return [
    ...broken.map((src) => `the image ${src} did not load`),
    ...fonts.failed.map((family) => `the font ${family} did not load`),
    ...(fonts.loaded ? [] : ["no font loaded from out/"]),
  ];
}
