import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { chromium, type Route } from "playwright";
import { siteUrl } from "../src/site.ts";

const outDir = path.join(import.meta.dirname, "..", "out");
const printDir = "print";
const printPath = `/${printDir}/portfolio`;
const pdfFile = path.join(outDir, "portfolio.pdf");

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

const missing: string[] = [];
const foreign: string[] = [];

async function serve(route: Route) {
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
    contentType: contentTypes[path.extname(file)] ?? "application/octet-stream",
  });
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: "light",
  });
  await context.route("**/*", serve);
  const page = await context.newPage();
  await page.emulateMedia({ media: "print", colorScheme: "light" });
  const response = await page.goto(`${siteUrl}${printPath}`, {
    waitUntil: "load",
  });
  if (!response?.ok()) {
    throw new Error(
      `${printPath} did not load from out/: ${response?.status() ?? "no response"}`,
    );
  }
  await page.evaluate(() => document.fonts.ready);
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
  const crowded = await page.evaluate(() =>
    [...document.querySelectorAll(".pdf-page")].flatMap((section, index) => {
      const footer = section.querySelector(":scope > footer");
      const page = section.getBoundingClientRect();
      const limit = footer ? footer.getBoundingClientRect().top : page.bottom;
      const over = [...section.querySelectorAll("h1, h2, p, li, a, img")].some(
        (element) => {
          const box = element.getBoundingClientRect();
          return (
            !element.closest("footer, .pdf-tint") &&
            (box.bottom > limit + 0.5 || box.right > page.right + 0.5)
          );
        },
      );
      return over ? [index + 1] : [];
    }),
  );
  const problems = [
    ...missing.map((pathname) => `${pathname} is not in out/`),
    ...foreign.map((href) => `${href} is not on ${siteUrl}`),
    ...crowded.map(
      (number) => `page ${number} runs into its footer or past its edge`,
    ),
    ...broken.map((src) => `the image ${src} did not load`),
    ...fonts.failed.map((family) => `the font ${family} did not load`),
    ...(fonts.loaded ? [] : ["no font loaded from out/"]),
  ];
  if (problems.length > 0) {
    throw new Error(
      `The portfolio PDF cannot be printed:\n${problems.join("\n")}`,
    );
  }
  await page.pdf({
    path: pdfFile,
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
    outline: true,
  });
} finally {
  await browser.close();
}

await rm(path.join(outDir, printDir), { recursive: true, force: true });
