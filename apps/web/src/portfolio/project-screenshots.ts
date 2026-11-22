import type { StaticImageData } from "next/image";
import aiDetective from "./screenshots/ai-detective.webp";
import brandably from "./screenshots/brandably.webp";
import emprenur from "./screenshots/emprenur.webp";
import gatsby from "./screenshots/gatsby.webp";
import hamiltonBlack from "./screenshots/hamilton-black.webp";
import iamadesigner from "./screenshots/iamadesigner.webp";
import orchiver from "./screenshots/orchiver.webp";
import plumb from "./screenshots/plumb.webp";
import site from "./screenshots/site.webp";
import sprouto from "./screenshots/sprouto.webp";
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
  "irfantayyab.com": {
    image: site,
    alt: "A post on the portfolio site, its title and text in Newsreader on a plain white page.",
  },
  "The AI Detective": {
    image: aiDetective,
    alt: "The AI Detective's sign-in page: a magnifying glass among document and PDF icons on the left, and the login form on a green panel on the right.",
  },
  Brandably: {
    image: brandably,
    alt: "Brandably's home page: the headline “Better Merch, for Better Brands” beside a cream T-shirt marked where a logo goes, under a dark bar with search, product menus and the basket.",
  },
  "Sprouto website": {
    image: sprouto,
    alt: "The Sprouto website's home page in the dark: the headline “Ready, steady, grow…” over a row of client work that can be dragged sideways.",
  },
  Emprenur: {
    image: emprenur,
    alt: "Emprenur's home page: a smiling man at a laptop, under the headline “Elevate Your Professional Journey with Our Empowering Latino Community” and a Join Now button.",
  },
  Gatsby: {
    image: gatsby,
    alt: "Gatsby's home page: “Find Where to Watch Movies, TV Shows, and Sports” over a wall of posters, with search at the top and a sidebar for browsing, people and sports.",
  },
  "Hamilton Black": {
    image: hamiltonBlack,
    alt: "Hamilton Black's home page: the name in thin white capitals across a black-and-white close-up of a lion's face.",
  },
  "I Am a Designer": {
    image: iamadesigner,
    alt: "I Am a Designer's login page: a hand painting watercolour on the left, and the sign-in form under the gold logo on the right.",
  },
};
