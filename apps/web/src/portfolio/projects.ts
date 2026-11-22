import type { Organisation } from "./experience";
import { jobTabs } from "./job-tabs";
import { plumbFixUrl, portfolioRepoUrl } from "./links";

export type ProjectLink = {
  label: string;
  url: string;
};

export type ProjectGroup = { job: Organisation } | "open-source" | "personal";

export type Project = {
  name: string;
  summary: string;
  part: string;
  stack: readonly string[];
  links: readonly ProjectLink[];
  group: ProjectGroup;
  featured?: true;
};

export const openSourcePrefix = "Open source:";

export function projectPrefix({ group, featured }: Project) {
  if (group === "open-source") {
    return openSourcePrefix;
  }
  if (featured && typeof group === "object") {
    return `${jobTabs[group.job].label}:`;
  }
  return undefined;
}

export function projectHeading(project: Project) {
  const prefix = projectPrefix(project);
  return prefix ? `${prefix} ${project.name}` : project.name;
}

export function projectId({ name }: Project) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const projects: readonly Project[] = [
  {
    name: "The AI Detective",
    summary:
      "A tool that helps teachers judge whether a student’s submission was written with AI, and shows them why.",
    part: "I built it end to end, frontend and backend. LlamaParse turns each upload into clean text, which a trained classifier checks section by section. An LLM then writes a report through structured output, so every report has the same shape: a likelihood score from 1 to 5, the share that reads as AI-written, and the reasons for both. Teachers can follow up in a chat about the same document. Real teachers tested it before launch.",
    stack: [
      "End-to-End Ownership",
      "RAG Chatbot",
      "Structured Output",
      "LlamaParse",
      "Supabase",
    ],
    links: [{ label: "Live", url: "https://www.theaidetective.com" }],
    group: { job: "Sprouto Group" },
    featured: true,
  },
  {
    name: "SQREAS",
    summary:
      "My final year project: one place for every student query, whether it comes from the web, email or WhatsApp.",
    part: "I built it end to end as my final year project. An LLM reads each query, works out its intent and routes it to the right person, whether a teacher, a head of department or a department’s team, with a second model taking over when the first fails or is unsure. Personal details are stripped before any text reaches a model, and every AI-drafted reply is approved by a member of staff before it goes out. n8n workflows handle the Gmail intake and escalate queries left waiting too long. The backend is FastAPI, the frontend React, and I deployed it on Oracle Cloud.",
    stack: [
      "End-to-End Ownership",
      "AI Routing",
      "Multi-LLM Orchestration",
      "Intent Detection",
      "Human-in-the-Loop",
      "PII Redaction",
      "Workflow Automation",
      "LangChain",
      "n8n",
      "FastAPI",
    ],
    links: [{ label: "Live", url: "https://sqreas.vercel.app" }],
    group: "personal",
    featured: true,
  },
  {
    name: "Brandably",
    summary:
      "A B2B store for branded merchandise: pick a product, upload your artwork, choose how it is printed, and order.",
    part: "I built it end to end, from the database to the checkout. A pipeline imports the supplier’s full catalog from spreadsheets into PostgreSQL, and a sync service updates stock and prices every 15 minutes. The Next.js store on top handles artwork uploads, Stripe payments and order management. The app is live and taking orders.",
    stack: [
      "End-to-End Ownership",
      "Data Pipelines",
      "E-commerce",
      "Stripe",
      "PostgreSQL",
      "Next.js",
    ],
    links: [{ label: "Live", url: "https://brandably.com" }],
    group: { job: "Sprouto Group" },
    featured: true,
  },
  {
    name: "Orchiver",
    summary:
      "A personal archive for Markdown, LaTeX, Word and PDF files, with a history of every edit and a copy in the cloud.",
    part: "I built it end to end. The React app works directly on my folders through the browser’s File System Access API, so every file stays a plain file, and every save becomes a version I can return to, with a live preview for Markdown and LaTeX. A three-way sync to Cloudflare R2 never loses a version and recovers cleanly from a crash, and a small Fastify server converts between formats with Pandoc and LibreOffice.",
    stack: [
      "End-to-End Ownership",
      "Local-First",
      "Three-Way Sync",
      "Cloudflare R2",
      "Fastify",
      "File System Access API",
    ],
    links: [],
    group: "personal",
    featured: true,
  },
  {
    name: "Sprouto website",
    summary:
      "The website I built for Sprouto Group, kept online as I left it, since the company has replaced it with a new one.",
    part: "I built it end to end in Next.js, with SEO-friendly server-side rendering, so search engines read every page. Its centrepiece is a 3D headset model in Three.js that you can drag to turn, with a reel of Sprouto’s past projects around it that rotates as you scroll, alongside parallax sections in Framer Motion.",
    stack: [
      "End-to-End Ownership",
      "Three.js",
      "Framer Motion",
      "SEO",
      "Server-Side Rendering",
      "Next.js",
    ],
    links: [{ label: "Live", url: "https://sprouto.vercel.app" }],
    group: { job: "Sprouto Group" },
  },
  {
    name: "Hamilton Black",
    summary:
      "The website of a UK property development and investment company, its seven pages animated as you scroll.",
    part: "The pages were set up in Webflow, and I wrote every animation by hand. GSAP and ScrollTrigger drive the parallax and the sections that pin while you scroll, SplitText reveals the headings, and the finance form fills in as you scroll down to it, all of it working on phones.",
    stack: ["GSAP", "ScrollTrigger", "Scroll Animations", "Parallax"],
    links: [{ label: "Live", url: "https://hamilton-black.webflow.io" }],
    group: { job: "Sprouto Group" },
  },
  {
    name: "Confidential project",
    summary:
      "A web platform built for a client under NDA, so it is shown without its name, links or screenshots.",
    part: "I built its form engine, where each form is defined as configuration rather than code: a schema of steps, each with its own fields and Zod validation, and branches that pick the next step from the user’s answers. More than eight forms run on it today. I also built its dashboard on dnd-kit, where each user moves, resizes and reshapes their widgets, and their layout is saved and holds on every screen size. I set up the team’s Turborepo monorepo with shared linting, formatting and pre-commit checks, and built shared components from the Figma designs with AI tools, which rarely needed a second pass from design.",
    stack: [
      "AI-Assisted Development",
      "Schema-Driven Forms",
      "Zod",
      "dnd-kit",
      "Per-User Layouts",
      "Turborepo",
    ],
    links: [],
    group: { job: "AmentoTech Pvt Ltd" },
  },
  {
    name: "Emprenur",
    summary:
      "A freelance marketplace for Latino professionals: clients post jobs, freelancers send proposals, and the work runs through contracts, chat and payments.",
    part: "I wrote most of its code, frontend and backend: real-time chat and notifications over Socket.io, one-time payments and subscriptions through Stripe and PayPal, and an affiliate system that tracks referral commissions and pays them out. I also added sign-in with Google, LinkedIn and Facebook, role- and region-based access control, and English, Spanish and Portuguese across the app and its emails.",
    stack: [
      "End-to-End Ownership",
      "Real-Time Chat",
      "Socket.io",
      "Stripe",
      "PayPal",
      "OAuth",
      "i18n",
    ],
    links: [{ label: "Live", url: "https://emprenur.com" }],
    group: { job: "CodeFlamme Pvt Ltd" },
  },
  {
    name: "Gatsby",
    summary:
      "A guide to where movies, shows and sports are streaming, with watchlists, collections and friends to share them with.",
    part: "I built a large share of its Next.js frontend, from the landing page, sign-up and onboarding to the home, profile, settings, pricing, blog and friends pages, each matched to its design to the pixel and responsive down to a phone.",
    stack: ["Pixel-Perfect UI", "Next.js", "Redux Toolkit", "Tailwind CSS"],
    links: [{ label: "Live", url: "https://gatsby.tv" }],
    group: { job: "CodeFlamme Pvt Ltd" },
  },
  {
    name: "I Am a Designer",
    summary:
      "A home for designers’ portfolios, where clients can search them by skill.",
    part: "When the site moved to React, I built most of the new frontend: designer profiles with image and video galleries, image cropping, public and private projects, résumé uploads with a preview, and saved projects. On its Express backend, I finished the email verification flow and built replies to contact queries, sent as templated emails.",
    stack: ["React Migration", "Redux", "Cloudinary", "Media Uploads"],
    links: [{ label: "Live", url: "https://www.iamadesigner.com" }],
    group: { job: "CodeFlamme Pvt Ltd" },
  },
  {
    name: "Plumb MCP",
    summary:
      "An MCP server that hands Figma designs to AI coding tools, without rate limits.",
    part: "I fixed a bug where clicking a large frame froze Figma. The plugin was serializing the whole design tree on every click; I changed it to send only the clicked node’s id and load the tree only when a tool asks for it, reusing the plugin’s existing fetch path so callers see no difference. The fix was merged with all 955 tests passing.",
    stack: [
      "Model Context Protocol",
      "AI Tooling",
      "Performance",
      "Figma Plugin API",
    ],
    links: [{ label: "The fix", url: plumbFixUrl }],
    group: "open-source",
  },
  {
    name: "irfantayyab.com",
    summary:
      "A portfolio and a blog, served as static files, with its claims held to the resume by a test.",
    part: "I built it end to end, with Next.js, as static files on Cloudflare. Tests hold every job, date and link on the site to my LaTeX resume, nothing goes live until every check passes in GitHub Actions, and every page is tested in a real browser without JavaScript and checked for accessibility. I built it by directing Claude Code and reviewing every change.",
    stack: [
      "End-to-End Ownership",
      "Agentic Coding",
      "Next.js",
      "Playwright",
      "CI/CD",
      "Cloudflare Workers",
      "Accessibility",
      "LaTeX",
    ],
    links: [{ label: "Code", url: portfolioRepoUrl }],
    group: "personal",
  },
];

export const featuredProjects = projects.filter(({ featured }) => featured);
