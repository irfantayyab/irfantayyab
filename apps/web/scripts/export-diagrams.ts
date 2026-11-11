import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  diagramAnchor,
  diagramImage,
  diagramImageFile,
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
  }
  problems.push(...requestProblems());
} finally {
  await browser.close();
}

if (problems.length > 0) {
  throw new Error(
    `The diagrams cannot be exported as images:\n${problems.join("\n")}`,
  );
}
