import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { extractText, getDocumentProxy } from "unpdf";
import {
  diagramAnchor,
  diagramImage,
  diagramImageFile,
  imageCopyFolder,
  imagePngFile,
} from "../src/app/page-ids";
import { imageBudget } from "../src/image-budget";
import {
  cardSize,
  feedPath,
  siteCardPath,
  siteDescription,
} from "../src/app/page-metadata";
import { pageColors, textColors } from "../src/app/theme";
import { experienceLinks } from "../src/portfolio/experience";
import { introLine } from "../src/portfolio/intro";
import { portfolioPdfPath, resumePath } from "../src/portfolio/links";
import { projects } from "../src/portfolio/projects";
import { resume } from "../src/resume/claims";
import { resumePdfPath } from "../src/resume/source";
import { absoluteUrl, siteUrl } from "../src/site";
import { formatDate } from "../src/writing/date";
import { loadWritingFrom } from "../src/writing/load";
import { writingDir } from "../src/writing/source";
import { calloutLabels } from "../src/writing/markdown";
import {
  postCardPath,
  postFilePath,
  postPath,
  tagPath,
} from "../src/writing/writing";
import type { Element, Root } from "hast";

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

function findAll(node: Root | Element, matches: (element: Element) => boolean) {
  const found: Element[] = [];
  for (const child of node.children) {
    if (child.type === "element") {
      if (matches(child)) {
        found.push(child);
      }
      found.push(...findAll(child, matches));
    }
  }
  return found;
}

function textOf(node: Element): string {
  return node.children
    .map((child) =>
      child.type === "text"
        ? child.value
        : child.type === "element"
          ? textOf(child)
          : "",
    )
    .join("");
}

function codeBlocks(body: Root) {
  return findAll(body, (element) => element.tagName === "pre").map((pre) => {
    const code = findAll(pre, (element) => element.tagName === "code")[0];
    const className = code?.properties.className;
    const meta = (code?.data as { meta?: unknown } | undefined)?.meta;
    return {
      diagram:
        Array.isArray(className) && className.includes("language-mermaid"),
      text: code ? textOf(code).replace(/\n$/, "") : "",
      title:
        typeof meta === "string"
          ? /title="([^"]*)"/.exec(meta)?.[1]
          : undefined,
    };
  });
}

const rich = writing.posts.map((post) => {
  const blocks = codeBlocks(post.body);
  return {
    post,
    callouts: findAll(
      post.body,
      (element) => element.properties.role === "note",
    ).length,
    code: blocks.filter(({ diagram }) => !diagram).map(({ text }) => text),
    titles: blocks
      .filter(({ diagram }) => !diagram)
      .map(({ title }) => title ?? ""),
    diagrams: blocks.filter(({ diagram }) => diagram).length,
    edgeLabels: blocks
      .filter(({ diagram }) => diagram)
      .reduce(
        (count, { text }) =>
          count + (text.match(/-->\s*\|[^|]+\|/g) ?? []).length,
        0,
      ),
    headings: findAll(
      post.body,
      (element) =>
        /^h[2-6]$/.test(element.tagName) &&
        !(
          Array.isArray(element.properties.className) &&
          element.properties.className.includes("sr-only")
        ),
    ).length,
    images: findAll(post.body, (element) => element.tagName === "img").length,
  };
});

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
        page.getByRole("link", { name: "@irfantayyab", exact: true }),
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
      "Writing",
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
      ["Portfolio (PDF)", portfolioPdfPath],
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
    await expect(section.locator("li a")).toHaveText(
      latest.map(({ title }) => title),
    );
    await expect(
      section.getByRole("link", { name: "All writing" }),
    ).toHaveAttribute("href", "/writing");
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

  test("the writing shows every kind of rich content somewhere", () => {
    expect(
      rich.some(({ callouts }) => callouts > 0),
      "a callout",
    ).toBe(true);
    expect(
      rich.some(({ code }) => code.length > 0),
      "code",
    ).toBe(true);
    expect(
      rich.some(({ diagrams }) => diagrams > 0),
      "a diagram",
    ).toBe(true);
    expect(
      rich.some(({ post }) => post.images.length > 0),
      "an image",
    ).toBe(true);
    expect(
      rich.some(({ headings }) => headings > 0),
      "a heading link",
    ).toBe(true);
    expect(
      rich.some(({ titles }) => titles.some(Boolean)),
      "a code block with a title",
    ).toBe(true);
  });

  for (const { post, callouts, code, titles, headings, images } of rich) {
    test(`${postPath(post.slug)} shows its callouts, code and heading links`, async ({
      page,
    }) => {
      await page.goto(postPath(post.slug));
      const body = page.locator(".post-body");
      const notes = body.getByRole("note");
      await expect(notes).toHaveCount(callouts);
      for (const note of await notes.all()) {
        await expect(note.locator(".callout-label")).toHaveText(
          new RegExp(`^(${Object.values(calloutLabels).join("|")})$`),
        );
      }
      const shown = await body
        .locator(".expressive-code pre")
        .evaluateAll((blocks) =>
          blocks.map((pre) =>
            [...pre.querySelectorAll(".ec-line .code")]
              .map((line) => line.textContent)
              .join("\n"),
          ),
        );
      expect(shown).toEqual(code);
      const shownTitles = await body
        .locator(".expressive-code .frame")
        .evaluateAll((frames) =>
          frames.map(
            (frame) =>
              frame.querySelector(":scope > figcaption .title")?.textContent ??
              "",
          ),
        );
      expect(shownTitles).toEqual(titles);
      await expect(
        page.locator('link[rel=stylesheet][href="/code.css"]'),
      ).toHaveCount(1);
      await expect(body.locator(".code-actions button")).toHaveCount(0);
      for (const line of await body.locator(".ec-line .code").all()) {
        await expect(line, "code starts unwrapped").toHaveCSS(
          "white-space",
          "pre",
        );
      }
      const links = body.locator(":is(h2, h3, h4, h5, h6) > a.heading-link");
      await expect(links).toHaveCount(headings);
      for (const link of await links.all()) {
        const id = await link.locator("..").getAttribute("id");
        await expect(link).toHaveAttribute("href", `#${id}`);
      }
    });

    test(`${postPath(post.slug)} serves its images, with their size`, async ({
      page,
      request,
    }) => {
      await page.goto(postPath(post.slug));
      await expect(page.locator(".post-body img")).toHaveCount(images);
      for (const image of post.images) {
        const src = postFilePath(post.slug, image.file);
        const elements = await page
          .locator(`.post-body img[src="${src}"]`)
          .all();
        expect(elements.length, src).toBeGreaterThan(0);
        for (const element of elements) {
          await expect(element).toHaveAttribute("alt", /\S/);
          await expect(element).toHaveAttribute("loading", "lazy");
          await expect(element).toHaveAttribute("width", String(image.width));
          await expect(element).toHaveAttribute("height", String(image.height));
        }
        const response = await request.get(src);
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toBe("image/webp");
        expect(Buffer.from(image.data).equals(await response.body())).toBe(
          true,
        );
      }
    });

    test(`${postPath(post.slug)}'s diagram images are its light drawings, at twice their size`, async ({
      page,
      request,
    }) => {
      const { diagrams = 0 } = rich.find((item) => item.post === post) ?? {};
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto(postPath(post.slug));
      for (let i = 0; i < diagrams; i++) {
        const box = await page
          .locator(`#${diagramAnchor(i)} .diagram-light svg`)
          .boundingBox();
        const response = await request.get(
          postFilePath(post.slug, diagramImageFile(i)),
        );
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toBe("image/png");
        const png = await response.body();
        expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
        expect(png.byteLength).toBeLessThanOrEqual(imageBudget);
        const { padding, scale } = diagramImage;
        const expected = [box?.width ?? 0, box?.height ?? 0].map(
          (side) => (side + 2 * padding) * scale,
        );
        for (const [j, side] of [
          png.readUInt32BE(16),
          png.readUInt32BE(20),
        ].entries()) {
          expect(Math.abs(side - (expected[j] ?? 0))).toBeLessThanOrEqual(2);
        }
      }
    });

    for (const { colorScheme } of themes) {
      test(`${postPath(post.slug)} shows each diagram once in the ${colorScheme} theme`, async ({
        page,
      }) => {
        const { diagrams } = rich.find((item) => item.post === post) ?? {};
        await page.emulateMedia({ colorScheme });
        await page.goto(postPath(post.slug));
        const visible = page.locator(".post-body .diagram svg:visible");
        await expect(visible).toHaveCount(diagrams ?? 0);
        const edgeLabels =
          rich.find((item) => item.post === post)?.edgeLabels ?? 0;
        let labelBoxCount = 0;
        for (const svg of await visible.all()) {
          await expect(svg).toHaveAttribute(
            "id",
            new RegExp(`^diagram-${colorScheme}-\\d+$`),
          );
          await expect(svg).toHaveAccessibleName(/\S/);
          await expect(svg).toHaveAccessibleDescription(/\S/);
          const box = await svg.boundingBox();
          expect(box?.width ?? 0).toBeGreaterThan(0);
          const labelBoxes = await svg
            .locator(".edgeLabel rect")
            .evaluateAll((rects) =>
              rects.map((rect) => {
                const style = getComputedStyle(rect);
                return { opacity: style.opacity, fill: style.fill };
              }),
            );
          const background = themes.find(
            (theme) => theme.colorScheme === colorScheme,
          )?.background;
          labelBoxCount += labelBoxes.length;
          for (const label of labelBoxes) {
            expect(label, "an edge label hides the line behind it").toEqual({
              opacity: "1",
              fill: background,
            });
          }
        }
        expect(
          labelBoxCount,
          "a box behind every labelled edge",
        ).toBeGreaterThanOrEqual(edgeLabels);
      });
    }
  }

  test("the export holds each post's images, their PNG copies and its diagram images, and no others", () => {
    const shipped = readdirSync(`${outDir}writing`, {
      recursive: true,
      encoding: "utf8",
    })
      .map((file) => file.replaceAll("\\", "/"))
      .filter(
        (file) =>
          /\.webp$|(?:^|\/)diagram-[^/]*\.png$/.test(file) ||
          file.split("/").at(-2) === imageCopyFolder,
      )
      .map((file) => `/writing/${file}`)
      .sort();
    expect(shipped).toEqual(
      rich
        .flatMap(({ post, diagrams }) => [
          ...post.images.flatMap(({ file }) => [
            postFilePath(post.slug, file),
            postFilePath(post.slug, imagePngFile(file)),
          ]),
          ...Array.from({ length: diagrams }, (_, i) =>
            postFilePath(post.slug, diagramImageFile(i)),
          ),
        ])
        .sort(),
    );
  });

  test("each post image's PNG copy is the same picture at the same size", async ({
    page,
    request,
  }) => {
    for (const post of writing.posts) {
      await page.goto(postPath(post.slug));
      for (const image of post.images) {
        const response = await request.get(
          postFilePath(post.slug, imagePngFile(image.file)),
        );
        expect(response.status()).toBe(200);
        expect(response.headers()["content-type"]).toBe("image/png");
        const png = await response.body();
        expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
          image.width,
          image.height,
        ]);
        const pixels = await page.evaluate(
          async ({ webp, copy }) => {
            const read = async (src: string) => {
              const element = new Image();
              element.src = src;
              await element.decode();
              const canvas = document.createElement("canvas");
              canvas.width = element.naturalWidth;
              canvas.height = element.naturalHeight;
              const context = canvas.getContext("2d");
              context?.drawImage(element, 0, 0);
              return [
                ...(context?.getImageData(0, 0, canvas.width, canvas.height)
                  .data ?? []),
              ];
            };
            const [a, b] = await Promise.all([read(webp), read(copy)]);
            return (
              a.length === b.length && a.every((value, i) => value === b[i])
            );
          },
          {
            webp: postFilePath(post.slug, image.file),
            copy: postFilePath(post.slug, imagePngFile(image.file)),
          },
        );
        expect(pixels).toBe(true);
      }
    }
  });

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

test.describe("with JavaScript", () => {
  for (const { post, code } of rich.filter((item) => item.code.length > 0)) {
    test(`${postPath(post.slug)} keeps the wrap and copy buttons clear of the code`, async ({
      page,
    }) => {
      await page.goto(postPath(post.slug));
      await expect(page.locator(".post-body .copy-button")).toHaveCount(
        code.length,
      );
      const blocks = await page
        .locator(".post-body .code-block")
        .evaluateAll((elements) =>
          elements.map((block) => {
            const actions = block
              .querySelector(".code-actions")
              ?.getBoundingClientRect();
            const frame = block
              .querySelector(".expressive-code")
              ?.getBoundingClientRect();
            return { actionsBottom: actions?.bottom, frameTop: frame?.top };
          }),
        );
      for (const { actionsBottom, frameTop } of blocks) {
        expect(actionsBottom, "the buttons' row").toBeDefined();
        expect(frameTop, "the code's frame").toBeDefined();
        expect(
          actionsBottom ?? Infinity,
          "the buttons sit over the code",
        ).toBeLessThanOrEqual(frameTop ?? -Infinity);
      }
    });

    test(`${postPath(post.slug)} copies each code block`, async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto(postPath(post.slug));
      const buttons = page.locator(".post-body .copy-button");
      await expect(buttons).toHaveCount(code.length);
      for (const [i, text] of code.entries()) {
        const button = buttons.nth(i);
        await expect(button).toHaveText("Copy");
        await button.click();
        await expect(button).toHaveText("Copied");
        await expect(
          button.locator("xpath=following-sibling::*[@role='status']"),
        ).toHaveText("Copied");
        const copied = await page.evaluate(() =>
          navigator.clipboard.readText(),
        );
        expect(copied.replaceAll("\r\n", "\n")).toBe(text);
      }
    });

    test(`${postPath(post.slug)} confirms a second copy as well as the first`, async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto(postPath(post.slug));
      const button = page.locator(".post-body .copy-button").first();
      const status = button.locator(
        "xpath=following-sibling::*[@role='status']",
      );
      await button.click();
      await expect(status).toHaveText("Copied");
      await page.waitForTimeout(1200);
      await status.evaluate((element) => {
        new MutationObserver((_, observer) => {
          if (element.textContent === "") {
            element.setAttribute("data-cleared", "");
            observer.disconnect();
          }
        }).observe(element, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      });
      await button.click();
      await expect(status).toHaveAttribute("data-cleared", "");
      await expect(status).toHaveText("Copied");
      await page.waitForTimeout(1200);
      await expect(button).toHaveText("Copied");
      await expect(button).toHaveText("Copy", { timeout: 5000 });
    });

    test(`${postPath(post.slug)} wraps a code block's lines on a phone, and unwraps them`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(postPath(post.slug));
      const blocks = page.locator(".post-body .code-block");
      await expect(blocks.locator(".wrap-button")).toHaveCount(code.length);
      const scrolledBefore: boolean[] = [];
      for (const [i, text] of code.entries()) {
        const block = blocks.nth(i);
        const pre = block.locator("pre");
        const wrap = block.locator(".wrap-button");
        const overflows = () =>
          pre.evaluate((element) => element.scrollWidth > element.clientWidth);
        const before = await overflows();
        scrolledBefore.push(before);
        await expect(wrap).toHaveAttribute("aria-pressed", "false");
        await wrap.click();
        await expect(wrap).toHaveAttribute("aria-pressed", "true");
        expect(await overflows(), "a wrapped block scrolls sideways").toBe(
          false,
        );
        expect(
          await pre.evaluate((element) =>
            [...element.querySelectorAll(".ec-line .code")]
              .map((line) => line.textContent)
              .join("\n"),
          ),
        ).toBe(text);
        const wrappedLines = await pre.evaluate((element) =>
          [...element.querySelectorAll(".ec-line .code")].flatMap((line) => {
            const range = document.createRange();
            range.selectNodeContents(line);
            const boxes = [...range.getClientRects()].filter(
              (box) => box.width > 0,
            );
            const firstTop = Math.min(...boxes.map((box) => box.top));
            const later = boxes.filter((box) => box.top > firstTop + 2);
            if (later.length === 0) {
              return [];
            }
            const walker = document.createTreeWalker(
              line,
              NodeFilter.SHOW_TEXT,
            );
            while (walker.nextNode()) {
              const node = walker.currentNode as Text;
              const index = node.data.search(/\S/);
              if (index >= 0) {
                const char = document.createRange();
                char.setStart(node, index);
                char.setEnd(node, index + 1);
                return [
                  {
                    start: char.getBoundingClientRect().left,
                    continuation: Math.min(...later.map((box) => box.left)),
                  },
                ];
              }
            }
            return [];
          }),
        );
        if (before) {
          expect(
            wrappedLines.length,
            "a block too wide for the phone wraps some line",
          ).toBeGreaterThan(0);
        }
        for (const { start, continuation } of wrappedLines) {
          expect(
            continuation,
            "a continuation starts deeper than its own line",
          ).toBeGreaterThan(start + 1);
        }
        await wrap.click();
        await expect(wrap).toHaveAttribute("aria-pressed", "false");
        expect(await overflows()).toBe(before);
      }
      expect(
        scrolledBefore.some(Boolean),
        "some block scrolls sideways on a phone before Wrap, as the default",
      ).toBe(true);
    });

    test(`${postPath(post.slug)} is reached from /writing with its code styled and its buttons working`, async ({
      page,
    }) => {
      await page.goto("/writing");
      await page.evaluate(() => {
        (window as { navigated?: string }).navigated = "same document";
      });
      await page.getByRole("link", { name: post.title }).click();
      await expect(page).toHaveURL(postPath(post.slug));
      expect(
        await page.evaluate(() => (window as { navigated?: string }).navigated),
        "the post opened without a full page load",
      ).toBe("same document");
      await expect(
        page.locator('head link[rel=stylesheet][href="/code.css"]'),
      ).toHaveCount(1);
      await expect(page.locator(".post-body .wrap-button")).toHaveCount(
        code.length,
      );
      const frame = page.locator(".post-body .expressive-code pre").first();
      await expect(frame).toHaveCSS("tab-size", "4");
      await expect(frame).not.toHaveCSS("border-bottom-width", "0px");
    });

    for (const { colorScheme } of themes) {
      test(`${postPath(post.slug)} outlines a focused code block in ink, in the ${colorScheme} theme`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await page.goto(postPath(post.slug));
        const pre = page.locator(".post-body .expressive-code pre").first();
        await expect(pre).toHaveAttribute("role", "group");
        await expect(pre).toHaveAccessibleName(/^Code/);
        await page.locator(".post-body .copy-button").first().focus();
        await page.keyboard.press("Tab");
        await expect(pre).toBeFocused();
        const ink = await page.evaluate(
          () => getComputedStyle(document.body).color,
        );
        await expect(pre).toHaveCSS("outline-color", ink);
        await expect(pre).toHaveCSS("outline-style", "solid");
      });
    }

    test(`${postPath(post.slug)} says when a copy fails`, async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
          value: { writeText: () => Promise.reject(new Error("Denied")) },
        });
      });
      await page.goto(postPath(post.slug));
      const button = page.locator(".post-body .copy-button").first();
      await button.click();
      await expect(button).toHaveText("Copy failed");
      await expect(
        button.locator("xpath=following-sibling::*[@role='status']"),
      ).toHaveText("Copy failed");
      await expect(button).toHaveText("Copy", { timeout: 5000 });
    });
  }
});

for (const { colorScheme } of themes) {
  test(`the ${colorScheme} theme's text colours are the ones the cards and diagrams use`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return Object.fromEntries(
        ["ink", "muted", "code"].map((name) => [
          name,
          style.getPropertyValue(`--${name}`).trim(),
        ]),
      );
    });
    expect(tokens).toEqual(textColors[colorScheme]);
  });
}

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

test("/code.css styles the code blocks, in both themes", async ({
  request,
}) => {
  const response = await request.get("/code.css");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/css");
  const css = await response.text();
  expect(css).toContain(".expressive-code");
  expect(css).toContain("@media (prefers-color-scheme: light)");
});

test("every page and file asks browsers for HTTPS only", async ({
  request,
}) => {
  const paths = [
    ...pages,
    feedPath,
    "/resume.pdf",
    portfolioPdfPath,
    "/code.css",
    siteCardPath,
  ];
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["strict-transport-security"], path).toBe(
      "max-age=31536000; includeSubDomains",
    );
  }
});

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

test.describe("the portfolio PDF", () => {
  async function loadPdf(request: APIRequestContext) {
    const response = await request.get(portfolioPdfPath);
    expect(response.status()).toBe(200);
    return {
      response,
      pdf: await getDocumentProxy(new Uint8Array(await response.body())),
    };
  }

  test("is served to open or save", async ({ request }) => {
    const { response } = await loadPdf(request);
    expect(response.headers()["content-type"]).toBe("application/pdf");
    expect(response.headers()["content-disposition"]).toBe(
      'inline; filename="Irfan_Tayyab_Portfolio.pdf"',
    );
  });

  test("has a cover, a page per project, the experience and the contact, each A4 landscape", async ({
    request,
  }) => {
    const { pdf } = await loadPdf(request);
    expect(pdf.numPages).toBe(projects.length + 3);
    for (let number = 1; number <= pdf.numPages; number++) {
      const { width, height } = (await pdf.getPage(number)).getViewport({
        scale: 1,
      });
      expect(width, `page ${number}'s width`).toBeCloseTo(841.89, 0);
      expect(height, `page ${number}'s height`).toBeCloseTo(595.28, 0);
    }
  });

  test("states every fact from the site's own modules", async ({ request }) => {
    const { pdf } = await loadPdf(request);
    const { text } = await extractText(pdf, { mergePages: true });
    const flat = text.replace(/\s+/g, " ");
    const facts = [
      resume.name,
      resume.headline,
      introLine,
      resume.email,
      ...projects.flatMap(({ name, summary, problem, part, stack }) => [
        name,
        summary,
        problem,
        part,
        ...stack,
      ]),
      ...resume.experience.flatMap(({ title, organisation, dates }) => [
        `${title}, ${organisation}`,
        dates,
      ]),
      ...resume.education.map(
        ({ title, organisation }) => `${title}, ${organisation}`,
      ),
    ];
    expect(facts.filter((fact) => !flat.includes(fact))).toEqual([]);
  });

  test("links only the site and the modules' own addresses, every one of them", async ({
    request,
  }) => {
    const { pdf } = await loadPdf(request);
    const found = new Set<string>();
    for (let number = 1; number <= pdf.numPages; number++) {
      const annotations: { subtype?: string; url?: string }[] = await (
        await pdf.getPage(number)
      ).getAnnotations();
      for (const { subtype, url } of annotations) {
        if (subtype === "Link") {
          expect(url, `a link on page ${number} has an address`).toBeTruthy();
          found.add(new URL(url ?? "").href);
        }
      }
    }
    const expected = new Set(
      [
        `mailto:${resume.email}`,
        siteUrl,
        absoluteUrl(resumePath),
        resume.links.github.url,
        resume.links.linkedin.url,
        ...projects.flatMap(({ links }) => links.map(({ url }) => url)),
        ...Object.values(experienceLinks),
      ].map((url) => new URL(url).href),
    );
    expect([...found].sort()).toEqual([...expected].sort());
  });

  test("is set in Newsreader only", async ({ request }) => {
    const { response } = await loadPdf(request);
    const fonts = [
      ...(await response.body())
        .toString("latin1")
        .matchAll(/\/FontName\s*\/[A-Z]{6}\+([^\s/<>[\]()]+)/g),
    ].map(([, name]) => name);
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.filter((name) => !name?.startsWith("Newsreader"))).toEqual([]);
  });

  test("leaves its page out of the export", async ({ request }) => {
    expect(existsSync(`${outDir}print`)).toBe(false);
    expect((await request.get("/print/portfolio")).status()).toBe(404);
  });
});

function localPath(url: string) {
  expect(url.startsWith(`${siteUrl}/`), `${url} is on ${siteUrl}`).toBe(true);
  return url.slice(siteUrl.length);
}

test.describe("sharing", () => {
  for (const path of pages) {
    const post = writing.posts.find(({ slug }) => postPath(slug) === path);
    test(`${path} has its canonical link and card`, async ({
      page,
      request,
    }) => {
      await page.goto(path);
      const head = page.locator("head");
      const meta = (property: string) =>
        head.locator(`meta[property="${property}"], meta[name="${property}"]`);
      await expect(head.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(head.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        absoluteUrl(path),
      );
      await expect(
        head.locator('link[rel="alternate"][type="application/rss+xml"]'),
      ).toHaveAttribute("href", absoluteUrl(feedPath));
      await expect(meta("og:url")).toHaveAttribute(
        "content",
        absoluteUrl(path),
      );
      await expect(meta("og:site_name")).toHaveAttribute(
        "content",
        resume.name,
      );
      await expect(meta("og:title")).toHaveAttribute(
        "content",
        post?.title ?? (path === "/" ? resume.name : /\S/),
      );
      await expect(meta("og:description")).toHaveAttribute(
        "content",
        path === "/" ? siteDescription : /\S/,
      );
      await expect(meta("og:type")).toHaveAttribute(
        "content",
        post ? "article" : "website",
      );
      await expect(meta("twitter:card")).toHaveAttribute(
        "content",
        "summary_large_image",
      );
      const image = absoluteUrl(post ? postCardPath(post.slug) : siteCardPath);
      await expect(meta("og:image")).toHaveAttribute("content", image);
      await expect(meta("og:image:width")).toHaveAttribute(
        "content",
        String(cardSize.width),
      );
      await expect(meta("og:image:height")).toHaveAttribute(
        "content",
        String(cardSize.height),
      );
      await expect(meta("og:image:alt")).toHaveAttribute(
        "content",
        post?.title ?? `${resume.name}, ${resume.headline}`,
      );
      if (post) {
        await expect(meta("article:published_time")).toHaveAttribute(
          "content",
          new RegExp(`^${escape(post.date)}`),
        );
        if (post.updated) {
          await expect(meta("article:modified_time")).toHaveAttribute(
            "content",
            new RegExp(`^${escape(post.updated)}`),
          );
        } else {
          await expect(meta("article:modified_time")).toHaveCount(0);
        }
        const labels = post.tags.map(
          (slug) => writing.tags.find((tag) => tag.slug === slug)?.label,
        );
        const tags = meta("article:tag");
        await expect(tags).toHaveCount(labels.length);
        for (const [i, label] of labels.entries()) {
          await expect(tags.nth(i)).toHaveAttribute("content", label ?? "");
        }
      }
      const response = await request.get(localPath(image));
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
      const png = await response.body();
      expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([
        cardSize.width,
        cardSize.height,
      ]);
    });
  }

  test("the 404 page has no canonical link, but still links the feed", async ({
    page,
  }) => {
    await page.goto("/no-such-page");
    await expect(page.locator('head link[rel="canonical"]')).toHaveCount(0);
    await expect(
      page.locator('head link[rel="alternate"][type="application/rss+xml"]'),
    ).toHaveAttribute("href", absoluteUrl(feedPath));
  });

  test("/writing links the feed", async ({ page }) => {
    await page.goto("/writing");
    await expect(page.getByRole("link", { name: "RSS" })).toHaveAttribute(
      "href",
      feedPath,
    );
  });

  test("the feed carries every post in full, without the site's code markup", async ({
    page,
    request,
  }) => {
    const response = await request.get(feedPath);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/xml");
    const xml = await response.text();
    const feed = await page.evaluate((source) => {
      const doc = new DOMParser().parseFromString(source, "application/xml");
      const content = "http://purl.org/rss/1.0/modules/content/";
      return {
        error: doc.querySelector("parsererror")?.textContent ?? null,
        items: [...doc.querySelectorAll("item")].map((item) => ({
          title: item.querySelector("title")?.textContent,
          link: item.querySelector("link")?.textContent,
          guid: item.querySelector("guid")?.textContent,
          body:
            item.getElementsByTagNameNS(content, "encoded")[0]?.textContent ??
            "",
        })),
      };
    }, xml);
    expect(feed.error).toBeNull();
    expect(
      feed.items.map(({ title, link, guid }) => ({ title, link, guid })),
    ).toEqual(
      writing.posts.map((post) => ({
        title: post.title,
        link: absoluteUrl(postPath(post.slug)),
        guid: absoluteUrl(postPath(post.slug)),
      })),
    );
    for (const [i, { code, diagrams, callouts }] of rich.entries()) {
      const body = feed.items[i]?.body ?? "";
      expect(body).not.toMatch(/expressive-code|post-code|post-diagram|<svg/);
      expect(body).not.toMatch(/(?:href|src)="(?!https?:|mailto:)/);
      expect((body.match(/<pre><code/g) ?? []).length).toBe(code.length);
      expect(
        (body.match(/<blockquote><p><strong>[^<]+:<\/strong>/g) ?? []).length,
      ).toBe(callouts);
      const diagramImages = [
        ...body.matchAll(/<img src="([^"]+\/diagram-\d+\.png)" alt="([^"]*)"/g),
      ].map(([, src = "", alt = ""]) => ({ src, alt }));
      expect(diagramImages).toHaveLength(diagrams);
      for (const [n, { src, alt }] of diagramImages.entries()) {
        expect(src).toBe(
          absoluteUrl(
            postFilePath(writing.posts[i]?.slug ?? "", diagramImageFile(n)),
          ),
        );
        expect(alt).toMatch(/\S/);
        const image = await request.get(localPath(src));
        expect(image.status()).toBe(200);
        expect(image.headers()["content-type"]).toBe("image/png");
      }
    }
  });

  test("the sitemap lists every page, and a post's last change", async ({
    page,
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const entries = await page.evaluate(
      (source) => {
        const doc = new DOMParser().parseFromString(source, "application/xml");
        return [...doc.querySelectorAll("url")].map((url) => ({
          loc: url.querySelector("loc")?.textContent ?? "",
          lastmod: url.querySelector("lastmod")?.textContent ?? null,
        }));
      },
      await response.text(),
    );
    expect(entries.map(({ loc }) => loc).sort()).toEqual(
      pages.map((path) => absoluteUrl(path)).sort(),
    );
    for (const { loc, lastmod } of entries) {
      const post = writing.posts.find(
        ({ slug }) => absoluteUrl(postPath(slug)) === loc,
      );
      if (post) {
        expect(lastmod).toMatch(
          new RegExp(`^${escape(post.updated ?? post.date)}`),
        );
      } else {
        expect(lastmod).toBeNull();
      }
    }
  });

  test("robots.txt allows everything and names the sitemap", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const robots = await response.text();
    expect(robots).toMatch(/^User-Agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).not.toMatch(/^Disallow:/m);
    expect(robots).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
  });
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
