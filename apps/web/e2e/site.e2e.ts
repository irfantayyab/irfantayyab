import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const outDir = fileURLToPath(new URL("../out/", import.meta.url));

const pages = readdirSync(outDir, { recursive: true, encoding: "utf8" })
  .map((file) => file.replaceAll("\\", "/"))
  .filter((file) => file.endsWith(".html"))
  .filter((file) => !file.split("/").some((part) => part.startsWith("_")))
  .filter((file) => file !== "404.html")
  .map((file) =>
    file === "index.html"
      ? "/"
      : `/${file.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "")}`,
  );

const themes = [
  { colorScheme: "light", background: "rgb(255, 255, 255)" },
  { colorScheme: "dark", background: "rgb(28, 27, 25)" },
] as const;

test("the export has pages to check", () => {
  expect(pages).toContain("/");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  for (const path of pages) {
    test(`${path} reads`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("main")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "@irfantayyab" }),
      ).toHaveAttribute("href", "https://github.com/irfantayyab");
    });
  }

  test("an unknown path answers 404 with the 404 page", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go to the home page" }),
    ).toHaveAttribute("href", "/");
  });

  test("Newsreader is loaded from the site itself", async ({ page }) => {
    const font = page.waitForResponse(
      (response) =>
        /\/_next\/static\/media\/newsreader_[^/]*\.woff2$/.test(
          response.url(),
        ) && response.status() === 200,
    );
    await page.goto("/");
    await font;
  });

  test("the skip link moves focus to the content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("main a").first()).toBeFocused();
  });

  for (const { colorScheme, background } of themes) {
    test(`the ${colorScheme} theme follows the device`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/");
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        background,
      );
    });
  }
});

test("/home redirects to /", async ({ request }) => {
  const response = await request.get("/home", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers()["location"]).toBe("/");
});

test.describe("accessibility", () => {
  for (const path of [...pages, "/no-such-page"]) {
    for (const { colorScheme } of themes) {
      test(`${path} passes axe in the ${colorScheme} theme`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(path);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });
    }
  }
});
