const diagramLink =
  /<p><strong>([^<]*)<\/strong><\/p><p>[^<]*<\/p><p><a href="([^"]+)">The diagram is on the site\.<\/a><\/p>/g;

export function feedDiagramLinks(html: string) {
  return [...html.matchAll(diagramLink)].map(([, title = "", href = ""]) => ({
    title,
    href,
  }));
}
