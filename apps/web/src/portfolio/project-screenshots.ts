import type { StaticImageData } from "next/image";
import orchiver from "./screenshots/orchiver.webp";
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
    alt: "SQREAS's Delivery page for an admin: two messages that failed to reach a student, one by WhatsApp and one by email, each with its query's number, the reason and a Send again button.",
  },
  Orchiver: {
    image: orchiver,
    alt: "Orchiver with a folder open: its files in a tree on the left, a LaTeX file in the editor, and its rendered preview beside it.",
  },
  "Plumb MCP": {
    image: plumb,
    alt: "The fix's commit on GitHub: its message, explaining why selection became pull-based, and the diff of the selection tool's docs.",
  },
  "Portfolio site": {
    image: site,
    alt: "A post on the portfolio site, its title and text in Newsreader on a plain white page.",
  },
};
