import { readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { pageColors } from "../src/app/theme";
import { resume } from "../src/resume/claims";
import { resumePdfPath } from "../src/resume/source";
import { formatDate } from "../src/writing/date";
import { loadWritingFrom } from "../src/writing/load";
import { writingDir } from "../src/writing/source";
import { postPath, tagPath } from "../src/writing/writing";

const outDir = fileURLToPath(new URL("../out/", import.meta.url));

const pages = readdirSync(outDir, { recursive: true, encoding: "utf8" })
  .map((file) => file.replaceAll("\\", "/"))
  .filter((file) => file.endsWith(".html"))
  .filter((file) => !file.split("/").some((part) => part.startsWith("_")))
  .filter((file) => file !== "404.html")
  .map((file) =>
    file === "index.html" ? "/" : `/${file.replace(/\.html$/, "")}`,
  );

const writing = await loadWritingFrom(writingDir);

const redirects = readFileSync(`${outDir}_redirects`, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [from = "", to = "", status = ""] = line.split(" ");
    return { from, to, status };
  });

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rgb(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) =>
    parseInt(hex.slice(start, start + 2), 16),
  );
  return `rgb(${r}, ${g}, ${b})`;
}

const themes = (["light", "dark"] as const).map((colorScheme) => ({
  colorScheme,
  background: rgb(pageColors[colorScheme]),
}));

const allowedElsewhere = new Set(["https://static.cloudflareinsights.com"]);
let externalRequests: string[] = [];

test.beforeEach(async ({ context, baseURL }) => {
  externalRequests = [];
  const origin = new URL(baseURL ?? "").origin;
  await context.route(
    (url) => url.origin !== origin,
    async (route) => {
      const url = new URL(route.request().url());
      if (!allowedElsewhere.has(url.origin)) {
        externalRequests.push(url.href);
      }
      await route.abort();
    },
  );
});

test.afterEach(() => {
  expect(externalRequests, "requests to other sites").toEqual([]);
});

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
      ).toHaveAttribute("href", resume.links.github.url);
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
    const box = await skip.boundingBox();
    expect(box?.width).toBeGreaterThan(80);
    expect(box?.height).toBeGreaterThan(20);
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("main a").first()).toBeFocused();
  });

  test("the home page links the resume", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "resume is a PDF" }),
    ).toHaveAttribute("href", "/resume.pdf");
  });

  test("the home page shows the projects, then the experience", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Projects",
      "Experience",
      ...(writing.posts.length > 0 ? ["Writing"] : []),
      "Contact",
    ]);
    const projects = page.locator("#projects ~ div > article");
    const count = await projects.count();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(5);
    for (const project of await projects.all()) {
      await expect(project.getByRole("heading", { level: 3 })).toHaveCount(1);
      await expect(project).toContainText("The problem.");
      await expect(project).toContainText("My part.");
    }
  });

  test("the home page lists every job from the resume's claims", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#experience ~ ul > li")).toHaveText(
      resume.experience.map(
        ({ title, organisation, dates }) =>
          new RegExp(
            `^${escape(`${title}, ${organisation}`)}\\s*${escape(dates)}$`,
          ),
      ),
    );
  });

  test("the home page links GitHub, LinkedIn, email and the resume", async ({
    page,
  }) => {
    await page.goto("/");
    const contact = page.locator("#contact ~ ul");
    for (const [name, href] of [
      ["GitHub", resume.links.github.url],
      ["LinkedIn", resume.links.linkedin.url],
      [resume.email, `mailto:${resume.email}`],
      ["Resume (PDF)", "/resume.pdf"],
    ]) {
      await expect(contact.getByRole("link", { name })).toHaveAttribute(
        "href",
        href ?? "",
      );
    }
  });

  test("every screenshot has alt text and loads lazily", async ({ page }) => {
    await page.goto("/");
    for (const image of await page.locator("main img").all()) {
      await expect(image).toHaveAttribute("alt", /\S/);
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(image).toHaveAttribute("width", /^\d+$/);
      await expect(image).toHaveAttribute("height", /^\d+$/);
    }
  });

  test("the nav leads home and to the writing, marking where you are", async ({
    page,
  }) => {
    for (const [path, current] of [
      ["/", "Home"],
      ["/writing", "Writing"],
      ...writing.posts
        .slice(0, 1)
        .map(({ slug }) => [postPath(slug), "Writing"]),
    ] as const) {
      await page.goto(path);
      const nav = page.getByRole("navigation", { name: "Site" });
      await expect(nav.getByRole("link")).toHaveText(["Home", "Writing"]);
      await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute(
        "href",
        "/",
      );
      await expect(nav.getByRole("link", { name: "Writing" })).toHaveAttribute(
        "href",
        "/writing",
      );
      await expect(nav.locator("[aria-current=page]")).toHaveText(current);
    }
  });

  test("the home page lists the latest writing", async ({ page }) => {
    await page.goto("/");
    const latest = writing.posts.slice(0, 5);
    const section = page.locator("section", {
      has: page.getByRole("heading", { level: 2, name: "Writing" }),
    });
    await expect(section).toHaveCount(latest.length > 0 ? 1 : 0);
    if (latest.length > 0) {
      await expect(section.locator("li a")).toHaveText(
        latest.map(({ title }) => title),
      );
      await expect(
        section.getByRole("link", { name: "All writing" }),
      ).toHaveAttribute("href", "/writing");
    }
  });

  test("/writing lists every post, newest first", async ({ page }) => {
    await page.goto("/writing");
    const items = page.locator("main li");
    await expect(items).toHaveCount(writing.posts.length);
    for (const [i, post] of writing.posts.entries()) {
      const item = items.nth(i);
      await expect(item.getByRole("link")).toHaveText(post.title);
      await expect(item.getByRole("link")).toHaveAttribute(
        "href",
        postPath(post.slug),
      );
      await expect(item.locator("time")).toHaveText(formatDate(post.date));
      await expect(item).toContainText(post.description);
    }
  });

  for (const post of writing.posts) {
    test(`${postPath(post.slug)} shows its post`, async ({ page }) => {
      await page.goto(postPath(post.slug));
      await expect(page).toHaveTitle(`${post.title} · ${resume.name}`);
      await expect(
        page.getByRole("heading", { level: 1, name: post.title }),
      ).toBeVisible();
      await expect(page.locator("meta[name=description]")).toHaveAttribute(
        "content",
        post.description,
      );
      await expect(page.locator("article time").first()).toHaveAttribute(
        "datetime",
        post.date,
      );
      await expect(
        page.getByRole("list", { name: "Tags" }).getByRole("link"),
      ).toHaveText(
        post.tags.map(
          (slug) => writing.tags.find((tag) => tag.slug === slug)?.label ?? "",
        ),
      );
      for (const slug of post.tags) {
        await expect(page.locator(`a[href="${tagPath(slug)}"]`)).toHaveCount(1);
      }
    });
  }

  for (const tag of writing.tags) {
    test(`${tagPath(tag.slug)} lists its posts`, async ({ page }) => {
      await page.goto(tagPath(tag.slug));
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: `Writing on ${tag.label}`,
        }),
      ).toBeVisible();
      await expect(page.locator("main li a")).toHaveText(
        writing.posts
          .filter((post) => post.tags.includes(tag.slug))
          .map(({ title }) => title),
      );
    });
  }

  test("an unknown post answers 404", async ({ page }) => {
    const response = await page.goto("/writing/no-such-post");
    expect(response?.status()).toBe(404);
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

test("_redirects holds /home and every redirect of the writing", () => {
  expect(redirects).toEqual([
    { from: "/home", to: "/", status: "301" },
    ...writing.redirects.map(({ from, to }) => ({ from, to, status: "301" })),
  ]);
});

for (const { from, to } of redirects) {
  test(`${from} redirects to ${to}, which answers`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toBe(to);
    expect((await request.get(to)).status()).toBe(200);
  });
}

test("the resume is the committed PDF, to open or save", async ({
  request,
}) => {
  const response = await request.get("/resume.pdf");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  expect(response.headers()["content-disposition"]).toBe(
    'inline; filename="Irfan_Tayyab_Resume.pdf"',
  );
  expect((await response.body()).equals(await readFile(resumePdfPath))).toBe(
    true,
  );
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
