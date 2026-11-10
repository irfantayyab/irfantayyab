import type { Redirect } from "@/writing/writing";

export const fixedRedirects: readonly Redirect[] = [{ from: "/home", to: "/" }];

export function redirectsFile(redirects: readonly Redirect[]) {
  return redirects.map(({ from, to }) => `${from} ${to} 301\n`).join("");
}
