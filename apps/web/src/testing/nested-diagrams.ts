export const nestedDiagramTitles = [
  "Inside a callout",
  "At the top level",
  "Inside a list",
];

function fence(title: string, indent: string) {
  return [
    "```mermaid",
    "flowchart TD",
    `  accTitle: ${title}`,
    `  accDescr: The diagram ${title.toLowerCase()}.`,
    "  a[One] --> b[Two]",
    "```",
  ].map((line) => `${indent}${line}`);
}

const [inCallout = "", atTop = "", inList = ""] = nestedDiagramTitles;

export const nestedDiagrams = [
  "Some text.",
  "",
  "> [!NOTE]",
  "> A callout.",
  ">",
  ...fence(inCallout, "> "),
  "",
  ...fence(atTop, ""),
  "",
  "- A list item.",
  "",
  ...fence(inList, "  "),
  "",
].join("\n");
