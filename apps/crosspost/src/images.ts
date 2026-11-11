import { imagePngFile } from "../../web/src/app/page-ids.ts";
import { requestBytes, RequestError } from "./request.ts";

export type ArticleImage = {
  number: number;
  src: string;
  alt: string;
  caption?: string;
};

const imageTag =
  /<figure><img ([^>]*)><figcaption>([\s\S]*?)<\/figcaption><\/figure>|<p><img ([^>]*)><\/p>|<img ([^>]*)>/g;

function attribute(attributes: string, name: string) {
  return new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes)?.[1] ?? "";
}

export function pngSource(src: string) {
  return src.replace(
    /\/([^/]+\.webp)$/,
    (_, file: string) => `/${imagePngFile(file)}`,
  );
}

export function withPngImages(html: string) {
  return html.replace(
    /(<img [^>]*?src=")([^"]+)(")/g,
    (_, before: string, src: string, after: string) =>
      `${before}${pngSource(src)}${after}`,
  );
}

export function withImageMarkers(html: string) {
  const images: ArticleImage[] = [];
  const marked = html.replace(
    imageTag,
    (
      _,
      figureAttributes: string | undefined,
      caption: string | undefined,
      blockAttributes: string | undefined,
      inlineAttributes: string | undefined,
    ) => {
      const attributes =
        figureAttributes ?? blockAttributes ?? inlineAttributes ?? "";
      const image: ArticleImage = {
        number: images.length + 1,
        src: pngSource(attribute(attributes, "src")),
        alt: attribute(attributes, "alt"),
        ...(caption === undefined ? {} : { caption }),
      };
      images.push(image);
      const marker = `[Image ${image.number}: ${image.alt}]`;
      return inlineAttributes === undefined ? `<p>${marker}</p>` : marker;
    },
  );
  return { html: marked, images };
}

function dataUri(bytes: Uint8Array) {
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function imageData(
  sources: readonly string[],
  fetcher: typeof fetch = fetch,
) {
  const data = new Map<string, string>();
  for (const src of new Set(sources)) {
    const answer = await requestBytes(fetcher, src);
    if (!answer.ok) {
      throw new RequestError(`${src} answered ${answer.status}`);
    }
    data.set(src, dataUri(answer.body));
  }
  return data;
}
