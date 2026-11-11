import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  diagramAnchor,
  diagramImage,
  diagramImageFile,
  imagePngFile,
} from "../src/app/page-ids.ts";
import { imageBudget } from "../src/image-budget.ts";
import { loadProblems, openFromOut, outDir, serveOut } from "./serve-out.ts";

const writingDir = path.join(outDir, "writing");

const slugs = (await readdir(writingDir, { withFileTypes: true }))
  .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".html"))
  .map((dirent) => dirent.name.slice(0, -".html".length))
  .sort();

const problems: string[] = [];
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: "light",
    deviceScaleFactor: diagramImage.scale,
    viewport: { width: 1280, height: 800 },
  });
  const requestProblems = await serveOut(context);
  const page = await context.newPage();
  for (const slug of slugs) {
    const postPath = `/writing/${slug}`;
    await openFromOut(page, postPath);
    problems.push(
      ...(await loadProblems(page)).map((problem) => `${postPath}: ${problem}`),
    );
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll(".post-body .diagram")].map(
        (diagram) => diagram.id,
      ),
    );
    for (const [index, id] of ids.entries()) {
      if (id !== diagramAnchor(index)) {
        problems.push(
          `${postPath}: diagram ${index + 1} has the id "${id}", not "${diagramAnchor(index)}"`,
        );
        continue;
      }
      const box = await page.evaluate(
        ({ id, padding }) => {
          const svg = document.querySelector(`#${id} .diagram-light svg`);
          if (!svg) {
            return undefined;
          }
          const rect = svg.getBoundingClientRect();
          return {
            x: rect.x + window.scrollX - padding,
            y: rect.y + window.scrollY - padding,
            width: rect.width + 2 * padding,
            height: rect.height + 2 * padding,
          };
        },
        { id, padding: diagramImage.padding },
      );
      if (!box || box.width <= 2 * diagramImage.padding) {
        problems.push(`${postPath}: diagram ${index + 1} has no light drawing`);
        continue;
      }
      const file = path.join(writingDir, slug, diagramImageFile(index));
      await page.screenshot({
        path: file,
        clip: box,
        fullPage: true,
        animations: "disabled",
      });
      const { size } = await stat(file);
      if (size > imageBudget) {
        problems.push(
          `${postPath}: ${diagramImageFile(index)} is ${Math.ceil(size / 1024)} KB, over the ${imageBudget / 1024} KB budget`,
        );
      }
    }
    const copies = await page.evaluate(async () => {
      const sources = [...document.querySelectorAll(".post-body img")]
        .map((image) => image.getAttribute("src") ?? "")
        .filter((src) => src.endsWith(".webp"));
      return Promise.all(
        sources.map(async (src) => {
          const image = new Image();
          image.src = src;
          try {
            await image.decode();
          } catch {
            return { src, png: undefined };
          }
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          canvas.getContext("2d")?.drawImage(image, 0, 0);
          return { src, png: canvas.toDataURL("image/png") };
        }),
      );
    });
    for (const { src, png } of copies) {
      const name = src.startsWith(`${postPath}/`)
        ? src.slice(postPath.length + 1)
        : undefined;
      if (!name || name.includes("/")) {
        problems.push(`${postPath}: the image ${src} is not in its folder`);
      } else if (!png?.startsWith("data:image/png;base64,")) {
        problems.push(`${postPath}: the image ${src} could not be drawn`);
      } else {
        const file = path.join(writingDir, slug, imagePngFile(name));
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(
          file,
          Buffer.from(png.slice("data:image/png;base64,".length), "base64"),
        );
      }
    }
  }
  problems.push(...requestProblems());
} finally {
  await browser.close();
}

if (problems.length > 0) {
  throw new Error(
    `The post images cannot be exported:\n${problems.join("\n")}`,
  );
}
