import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { experienceLinks } from "@/portfolio/experience";
import { introLine } from "@/portfolio/intro";
import { resumePath } from "@/portfolio/links";
import { projectScreenshots } from "@/portfolio/project-screenshots";
import { projects, type Project } from "@/portfolio/projects";
import { resume } from "@/resume/claims";
import { absoluteUrl } from "@/site";
import "./portfolio.css";

export const metadata: Metadata = {
  title: "Portfolio",
  robots: { index: false },
};

const pageCount = projects.length + 3;

function shown(url: string) {
  return url
    .replace(/^mailto:/, "")
    .replace(/^https:\/\/(www\.)?/, "")
    .replace(/\/$/, "");
}

const siteLink = absoluteUrl("/");

const contacts = [
  { label: "Email", url: `mailto:${resume.email}` },
  { label: "Site", url: siteLink },
  { label: "GitHub", url: resume.links.github.url },
  { label: "LinkedIn", url: resume.links.linkedin.url },
  { label: "Resume", url: absoluteUrl(resumePath) },
];

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="pdf-small font-semibold text-muted uppercase">{children}</p>
  );
}

function Page({ number, children }: { number: number; children: ReactNode }) {
  return (
    <section className="pdf-page relative bg-page">
      {children}
      <footer className="pdf-small absolute inset-x-20 bottom-8 flex justify-between border-t border-underline pt-3 text-muted">
        <span>
          {resume.name} · {resume.headline}
        </span>
        <span>
          {number} / {pageCount}
        </span>
      </footer>
    </section>
  );
}

function Cover() {
  const shots = projects.flatMap(({ name }) => {
    const screenshot = projectScreenshots[name];
    return screenshot ? [screenshot] : [];
  });
  return (
    <section className="pdf-page grid grid-cols-[1fr_420px] bg-page">
      <div className="flex flex-col justify-between py-18 pr-12 pl-20">
        <Label>Portfolio</Label>
        <div>
          <h1 className="pdf-display">{resume.name}</h1>
          <p className="pdf-subtitle mt-5 text-muted">{resume.headline}</p>
          <p className="pdf-lead mt-10 max-w-140">{introLine}</p>
        </div>
        <ul className="pdf-body flex flex-wrap gap-x-7 gap-y-1">
          {contacts
            .filter(({ label }) => label !== "Resume")
            .map(({ label, url }) => (
              <li key={label}>
                <a href={url}>{shown(url)}</a>
              </li>
            ))}
        </ul>
      </div>
      <div className="pdf-tint relative overflow-hidden">
        {shots.slice(0, 3).map((shot, index) => (
          <Image
            key={shot.image.src}
            src={shot.image}
            alt=""
            loading="eager"
            className="pdf-shot absolute w-88"
            style={{ top: 48 + index * 200, left: 20 + (index % 2) * 20 }}
          />
        ))}
      </div>
    </section>
  );
}

function Stack({ items }: { items: readonly string[] }) {
  return (
    <ul className="pdf-small flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-underline px-3 py-0.5 text-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function ProjectLinks({ project }: { project: Project }) {
  if (project.links.length === 0) {
    return null;
  }
  return (
    <ul className="pdf-body space-y-1">
      {project.links.map(({ label, url }) => (
        <li key={url}>
          <span className="text-muted">{label}: </span>
          <a href={url} className="whitespace-nowrap">
            {shown(url)}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Story({ project }: { project: Project }) {
  return (
    <div className="pdf-body space-y-4">
      <p>
        <strong className="font-semibold">The problem.</strong>{" "}
        {project.problem}
      </p>
      <p>
        <strong className="font-semibold">My part.</strong> {project.part}
      </p>
    </div>
  );
}

function ProjectPage({ project, index }: { project: Project; index: number }) {
  const heading = (
    <>
      <Label>
        Project {index + 1} of {projects.length}
      </Label>
      <h2 className="pdf-title mt-3">{project.name}</h2>
      <p className="pdf-lead mt-2 text-muted">{project.summary}</p>
    </>
  );
  const screenshot = projectScreenshots[project.name];
  return (
    <Page number={index + 2}>
      {screenshot ? (
        <div className="grid h-full grid-cols-[1fr_440px] gap-12 px-20 pt-16 pb-24">
          <div className="flex flex-col">
            {heading}
            <div className="mt-6">
              <Story project={project} />
            </div>
          </div>
          <div className="flex flex-col gap-6 pt-9">
            <Image
              src={screenshot.image}
              alt={screenshot.alt}
              loading="eager"
              className="pdf-shot h-auto w-full"
            />
            <Stack items={project.stack} />
            <ProjectLinks project={project} />
          </div>
        </div>
      ) : (
        <div className="grid h-full grid-cols-[360px_1fr] gap-16 px-20 pt-16 pb-24">
          <div className="flex flex-col gap-8">
            <div>{heading}</div>
            <Stack items={project.stack} />
            <ProjectLinks project={project} />
          </div>
          <div className="pdf-rule flex flex-col justify-center pl-12">
            <Story project={project} />
          </div>
        </div>
      )}
    </Page>
  );
}

function ExperiencePage() {
  return (
    <Page number={projects.length + 2}>
      <div className="px-20 pt-16">
        <Label>From the resume</Label>
        <h2 className="pdf-title mt-3">Experience</h2>
        <ul className="mt-10 border-t border-underline">
          {resume.experience.map(({ title, organisation, dates }) => {
            const link = experienceLinks[organisation];
            return (
              <li
                key={`${title}, ${organisation}`}
                className="pdf-lead flex items-baseline justify-between gap-8 border-b border-underline py-4"
              >
                <span>
                  <span className="font-semibold">{title}</span>,{" "}
                  {link ? <a href={link}>{organisation}</a> : organisation}
                </span>
                <span className="pdf-body shrink-0 text-muted">{dates}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-10">
          <Label>Education</Label>
          <ul className="pdf-lead mt-3">
            {resume.education.map(({ title, organisation, dates }) => (
              <li key={`${title}, ${organisation}`}>
                <span className="font-semibold">{title}</span>, {organisation}
                {dates ? <span className="text-muted"> · {dates}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Page>
  );
}

function ContactPage() {
  return (
    <Page number={pageCount}>
      <div className="grid h-full grid-cols-[2fr_3fr] gap-16 px-20 pt-16 pb-24">
        <div className="flex flex-col justify-center">
          <Label>Contact</Label>
          <h2 className="pdf-title mt-3">{resume.name}</h2>
          <p className="pdf-subtitle mt-3 text-muted">{resume.headline}</p>
        </div>
        <ul className="pdf-rule flex flex-col justify-center gap-5 pl-12">
          {contacts.map(({ label, url }) => (
            <li key={label}>
              <Label>{label}</Label>
              <a href={url} className="pdf-lead whitespace-nowrap">
                {shown(url)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  );
}

export default function PortfolioPrint() {
  return (
    <main>
      <Cover />
      {projects.map((project, index) => (
        <ProjectPage key={project.name} project={project} index={index} />
      ))}
      <ExperiencePage />
      <ContactPage />
    </main>
  );
}
