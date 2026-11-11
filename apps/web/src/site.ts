import { productionUrl } from "./production-url.ts";

export { productionUrl };

export function parseSiteUrl(value: string | undefined) {
  if (value === undefined || value === "") {
    return productionUrl;
  }
  const url = URL.parse(value);
  if (url?.protocol !== "https:" || url.origin !== value) {
    throw new Error(
      `SITE_URL must be an https origin with no path and no trailing slash, like ${productionUrl}, not "${value}"`,
    );
  }
  return value;
}

export const siteUrl = parseSiteUrl(process.env.SITE_URL);

export function absoluteUrl(path: string) {
  return path === "/" ? siteUrl : new URL(path, siteUrl).href;
}
