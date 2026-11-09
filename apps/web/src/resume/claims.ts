export type ResumeEntry = {
  title: string;
  organisation: string;
  dates: string;
};

export type ResumeLink = {
  url: string;
  label: string;
};

export const resume = {
  name: "Irfan Tayyab",
  headline: "Full-Stack AI Engineer",
  email: "irfantayyib07@gmail.com",
  links: {
    linkedin: {
      url: "https://www.linkedin.com/in/irfan-tayyab-31b52330b/",
      label: "linkedin.com/in/irfan-tayyab-31b52330b",
    },
    github: {
      url: "https://github.com/irfantayyab",
      label: "github.com/irfantayyab",
    },
    website: {
      url: "https://irfantayyab.vercel.app/",
      label: "irfantayyab.vercel.app",
    },
  },
  education: [
    {
      title: "BS in Computer Science",
      organisation: "Virtual University of Pakistan",
      dates: "",
    },
  ],
  experience: [
    {
      title: "Software Engineer",
      organisation: "AmentoTech Pvt Ltd",
      dates: "Nov 2025 – Oct 2026",
    },
    {
      title: "Open Source Contributor",
      organisation: "Plumb MCP",
      dates: "Aug 2026",
    },
    {
      title: "MERN Stack Engineer",
      organisation: "Sprouto Group",
      dates: "Mar 2025 – Nov 2025",
    },
    {
      title: "MERN Stack Developer",
      organisation: "CodeFlamme Pvt Ltd",
      dates: "Jul 2024 – Feb 2025",
    },
  ],
} as const satisfies {
  name: string;
  headline: string;
  email: string;
  links: Readonly<Record<"linkedin" | "github" | "website", ResumeLink>>;
  education: readonly ResumeEntry[];
  experience: readonly ResumeEntry[];
};
