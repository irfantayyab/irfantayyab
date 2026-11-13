import type { Metadata } from "next";
import Link from "next/link";
import { experienceLinks } from "@/portfolio/experience";
import { introLine } from "@/portfolio/intro";
import {
  portfolioPdfPath,
  portfolioRepoUrl,
  resumePath,
} from "@/portfolio/links";
import { ProjectBlock } from "@/portfolio/project-block";
import { projects } from "@/portfolio/projects";
import { resume } from "@/resume/claims";
import { loadWriting } from "@/writing/load";
import { PostList } from "@/writing/post-list";
import { latestPostCount } from "@/writing/writing";
import { pageMetadata, siteDescription } from "@/app/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/",
  description: siteDescription,
});

const contactLinks = [
  { label: "GitHub", url: resume.links.github.url },
  { label: "LinkedIn", url: resume.links.linkedin.url },
  { label: resume.email, url: `mailto:${resume.email}` },
  { label: "Resume (PDF)", url: resumePath },
  { label: "Portfolio (PDF)", url: portfolioPdfPath },
];

export default async function HomePage() {
  const { posts } = await loadWriting();
  const latest = posts.slice(0, latestPostCount);
  return (
    <>
      <h1 className="text-4xl/tight font-semibold tracking-tight">
        {resume.name}
      </h1>
      <p className="mt-2 font-sans text-base text-muted">{resume.headline}</p>

      <div className="mt-10 space-y-5">
        <p>{introLine}</p>
        <p>
          I have shipped React, Next.js and Node.js products in teams, and my
          final year project in computer science is SQREAS, an AI platform that
          routes student queries, below.
        </p>
        <p>
          I care about software that stays easy to change: typed code, real
          tests, and checks that pass before anything ships. This site is built
          that way, in the open. Its source is on{" "}
          <a href={portfolioRepoUrl}>GitHub</a>, and the{" "}
          <a href={resumePath}>resume is a PDF</a> to read or save.
        </p>
      </div>

      <section aria-labelledby="projects" className="mt-16">
        <h2 id="projects" className="text-2xl font-semibold tracking-tight">
          Projects
        </h2>
        <div className="mt-8 space-y-14">
          {projects.map((project) => (
            <ProjectBlock key={project.name} project={project} />
          ))}
        </div>
      </section>

      <section aria-labelledby="experience" className="mt-16">
        <h2 id="experience" className="text-2xl font-semibold tracking-tight">
          Experience
        </h2>
        <ul className="mt-6 space-y-3">
          {resume.experience.map(({ title, organisation, dates }) => {
            const link = experienceLinks[organisation];
            return (
              <li
                key={`${title}, ${organisation}`}
                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span>
                  {title},{" "}
                  {link ? <a href={link}>{organisation}</a> : organisation}
                </span>{" "}
                <span className="shrink-0 font-sans text-base text-muted">
                  {dates}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="writing" className="mt-16">
        <h2 id="writing" className="text-2xl font-semibold tracking-tight">
          Writing
        </h2>
        <div className="mt-6">
          <PostList posts={latest} descriptions={false} />
        </div>
        <p className="mt-6 font-sans text-base">
          <Link href="/writing">All writing</Link>
        </p>
      </section>

      <section aria-labelledby="contact" className="mt-16">
        <h2 id="contact" className="text-2xl font-semibold tracking-tight">
          Contact
        </h2>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-sans text-base">
          {contactLinks.map(({ label, url }) => (
            <li key={label}>
              <a href={url}>{label}</a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
