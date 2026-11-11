import { describe, expect, it } from "vitest";
import {
  imageData,
  pngSource,
  withImageMarkers,
  withPngImages,
} from "./images.ts";

describe("pngSource", () => {
  it("points a WebP at its PNG copy, and leaves a PNG as it is", () => {
    expect(pngSource("https://a.dev/writing/p/shot.webp")).toBe(
      "https://a.dev/writing/p/png/shot.png",
    );
    expect(pngSource("https://a.dev/writing/p/diagram-1.png")).toBe(
      "https://a.dev/writing/p/diagram-1.png",
    );
  });
});

describe("withPngImages", () => {
  it("swaps every WebP source for its PNG copy, whatever comes before src", () => {
    expect(
      withPngImages(
        '<p><img alt="x" src="https://a.dev/writing/p/a.webp"> and <img src="https://a.dev/writing/p/b.webp" alt="y"></p>',
      ),
    ).toBe(
      '<p><img alt="x" src="https://a.dev/writing/p/png/a.png"> and <img src="https://a.dev/writing/p/png/b.png" alt="y"></p>',
    );
  });
});

describe("withImageMarkers", () => {
  it("numbers figures, images alone in a paragraph and inline images in order", () => {
    const { html, images } = withImageMarkers(
      '<figure><img src="https://a.dev/writing/p/a.webp" alt="A &#x26; B" width="8"><figcaption>Cap <em>it</em></figcaption></figure><p><img src="https://a.dev/writing/p/diagram-1.png" alt="D"></p><p>See <img src="https://a.dev/i.png" alt="I"> here.</p>',
    );
    expect(html).toBe(
      "<p>[Image 1: A &#x26; B]</p><p>[Image 2: D]</p><p>See [Image 3: I] here.</p>",
    );
    expect(images).toEqual([
      {
        number: 1,
        src: "https://a.dev/writing/p/png/a.png",
        alt: "A &#x26; B",
        caption: "Cap <em>it</em>",
      },
      { number: 2, src: "https://a.dev/writing/p/diagram-1.png", alt: "D" },
      { number: 3, src: "https://a.dev/i.png", alt: "I" },
    ]);
  });

  it("leaves a body without images as it is", () => {
    expect(withImageMarkers("<p>Text.</p>")).toEqual({
      html: "<p>Text.</p>",
      images: [],
    });
  });
});

describe("imageData", () => {
  it("fetches each image once, as a PNG data URI", async () => {
    const fetched: string[] = [];
    const fetcher = (async (url: string) => {
      fetched.push(url);
      return new Response(new Uint8Array([1, 2, 3]));
    }) as typeof fetch;
    const data = await imageData(
      ["https://a.dev/a.png", "https://a.dev/a.png"],
      fetcher,
    );
    expect(fetched).toEqual(["https://a.dev/a.png"]);
    expect(data.get("https://a.dev/a.png")).toBe("data:image/png;base64,AQID");
  });

  it("fails on an image that does not answer", async () => {
    const fetcher = (async () =>
      new Response("", { status: 404 })) as unknown as typeof fetch;
    await expect(imageData(["https://a.dev/a.png"], fetcher)).rejects.toThrow(
      "https://a.dev/a.png answered 404",
    );
  });
});
