import { describe, expect, it } from "vitest";
import { absoluteUrl, parseSiteUrl, productionUrl, siteUrl } from "./site";

describe("parseSiteUrl", () => {
  it("falls back to the production address when SITE_URL is unset or empty", () => {
    expect(parseSiteUrl(undefined)).toBe(productionUrl);
    expect(parseSiteUrl("")).toBe(productionUrl);
  });

  it("takes a preview's address as it is", () => {
    const preview = "https://pr-7-portfolio.irfantayyab.workers.dev";
    expect(parseSiteUrl(preview)).toBe(preview);
  });

  it.each([
    ["a trailing slash", "https://example.com/"],
    ["a path", "https://example.com/writing"],
    ["http", "http://example.com"],
    ["uppercase", "https://Example.com"],
    ["a port written out", "https://example.com:443"],
    ["a query", "https://example.com?a=1"],
    ["no scheme", "example.com"],
  ])("refuses an address with %s", (_, value) => {
    expect(() => parseSiteUrl(value)).toThrow(/SITE_URL/);
  });
});

describe("absoluteUrl", () => {
  it("writes the home page as the bare origin, as Next.js does", () => {
    expect(absoluteUrl("/")).toBe(siteUrl);
  });

  it("puts a path on the site's address", () => {
    expect(absoluteUrl("/writing/a-post")).toBe(`${siteUrl}/writing/a-post`);
  });
});
