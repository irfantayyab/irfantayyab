import { describe, expect, it } from "vitest";
import { formatDate } from "./date";

describe("formatDate", () => {
  it.each([
    ["2026-11-10", "10 Nov 2026"],
    ["2026-01-01", "1 Jan 2026"],
    ["2025-12-31", "31 Dec 2025"],
  ])("writes %s as %s", (day, text) => {
    expect(formatDate(day)).toBe(text);
  });

  it.each(["2026-13-01", "10 Nov 2026", ""])("rejects %j", (day) => {
    expect(() => formatDate(day)).toThrow(/Not a YYYY-MM-DD date/);
  });
});
