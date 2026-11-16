export function linkTarget(
  href: string,
): { target: "_blank"; rel: string } | Record<string, never> {
  return /^https?:\/\//i.test(href)
    ? { target: "_blank", rel: "noopener" }
    : {};
}
