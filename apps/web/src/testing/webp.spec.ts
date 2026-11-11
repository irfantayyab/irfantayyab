import { imageSize } from "image-size";
import { describe, expect, it } from "vitest";
import { webpHeader } from "./webp";

describe("webpHeader", () => {
  it("is read as a WebP of its width and height", () => {
    expect(imageSize(webpHeader(1200, 630))).toMatchObject({
      type: "webp",
      width: 1200,
      height: 630,
    });
  });

  it("is padded to the length asked for", () => {
    expect(webpHeader(10, 10, 4096).byteLength).toBe(4096);
    expect(webpHeader(10, 10).byteLength).toBe(30);
  });
});
