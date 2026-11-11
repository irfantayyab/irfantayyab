import { rm } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { loadProblems, openFromOut, outDir, serveOut } from "./serve-out.ts";

const printDir = "print";
const printPath = `/${printDir}/portfolio`;
const pdfFile = path.join(outDir, "portfolio.pdf");

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: "light",
  });
  const requestProblems = await serveOut(context);
  const page = await context.newPage();
  await page.emulateMedia({ media: "print", colorScheme: "light" });
  await openFromOut(page, printPath);
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
    ...requestProblems(),
    ...crowded.map(
      (number) => `page ${number} runs into its footer or past its edge`,
    ),
    ...(await loadProblems(page)),
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
