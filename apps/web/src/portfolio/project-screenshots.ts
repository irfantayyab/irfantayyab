import type { StaticImageData } from "next/image";
import plumb from "./screenshots/plumb.webp";
import site from "./screenshots/site.webp";
import sqreas from "./screenshots/sqreas.webp";

export type Screenshot = {
  image: StaticImageData;
  alt: string;
};

export const projectScreenshots: Readonly<Record<string, Screenshot>> = {
  SQREAS: {
    image: sqreas,
    alt: "SQREAS's sign-in page, asking for a university Google account.",
  },
  "Plumb MCP": {
    image: plumb,
    alt: "The fix's commit on GitHub: its message, and the diff of the selection tool's docs.",
  },
  "Portfolio site": {
    image: site,
    alt: "A post on the portfolio site, its title and text in Newsreader on a plain white page.",
  },
};
