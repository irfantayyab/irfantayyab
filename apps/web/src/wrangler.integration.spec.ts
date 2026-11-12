import { readFile } from "node:fs/promises";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { productionUrl } from "./production-url";

type Route = string | { pattern: string; custom_domain?: boolean };

async function readWranglerConfig() {
  const text = await readFile(
    new URL("../wrangler.jsonc", import.meta.url),
    "utf8",
  );
  const { config, error } = ts.parseConfigFileTextToJson(
    "wrangler.jsonc",
    text,
  );
  expect(error).toBeUndefined();
  return config as { routes?: Route[]; preview_urls?: boolean };
}

describe("the Worker's config", () => {
  it("serves the production address as its one Custom Domain", async () => {
    const { routes = [] } = await readWranglerConfig();
    expect(routes).toEqual([
      { pattern: new URL(productionUrl).host, custom_domain: true },
    ]);
  });

  it("keeps preview URLs on for pull requests", async () => {
    const { preview_urls } = await readWranglerConfig();
    expect(preview_urls).toBe(true);
  });
});
