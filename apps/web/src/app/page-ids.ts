export const mainId = "main";

export const pageIds: ReadonlySet<string> = new Set([mainId]);

export const diagramIdPrefix = "diagram-";

const diagramId = new RegExp(`^${diagramIdPrefix}(?:(?:light|dark)-)?\\d`);

export function diagramAnchor(index: number) {
  return `${diagramIdPrefix}${index + 1}`;
}

export function isPageId(id: string) {
  return pageIds.has(id) || diagramId.test(id);
}
