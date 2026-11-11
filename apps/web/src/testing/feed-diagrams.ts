const diagramImage =
  /<p><img src="([^"]+)" alt="([^"]*)"><\/p><p>([^<]*)<\/p>/g;

export function feedDiagramImages(html: string) {
  return [...html.matchAll(diagramImage)].map(
    ([, src = "", alt = "", description = ""]) => ({ src, alt, description }),
  );
}
