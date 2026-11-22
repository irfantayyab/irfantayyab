export const mainId = "main";

export const homeSectionIds = {
  projects: "projects",
  experience: "experience",
} as const;

export const projectTabIds = [
  "featured",
  "amentotech",
  "sprouto",
  "codeflamme",
  "open-source",
  "personal",
] as const;

export type ProjectTabId = (typeof projectTabIds)[number];

export const pageIds: ReadonlySet<string> = new Set([mainId, ...projectTabIds]);

export const diagramIdPrefix = "diagram-";

const diagramId = new RegExp(`^${diagramIdPrefix}(?:(?:light|dark)-\\d|\\d+$)`);

export function diagramAnchor(index: number) {
  return `${diagramIdPrefix}${index + 1}`;
}

export const diagramImage = { padding: 24, scale: 2 } as const;

export function diagramImageFile(index: number) {
  return `${diagramAnchor(index)}.png`;
}

export const imageCopyFolder = "png";

export function imagePngFile(file: string) {
  return `${imageCopyFolder}/${file.replace(/\.webp$/, "")}.png`;
}

export function isPageId(id: string) {
  return pageIds.has(id) || diagramId.test(id);
}
