import Image from "next/image";
import { projectScreenshots } from "./project-screenshots";
import type { Project } from "./projects";

export function ProjectBlock({ project }: { project: Project }) {
  const { name, summary, problem, part, links } = project;
  const screenshot = projectScreenshots[name];
  return (
    <article>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h3 className="text-xl font-semibold">{name}</h3>
        {links.length > 0 ? (
          <ul className="flex flex-wrap gap-x-4 font-sans text-base">
            {links.map(({ label, url }) => (
              <li key={url}>
                <a href={url} aria-label={`${name}: ${label}`}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="mt-1 text-muted">{summary}</p>
      <p className="mt-4">
        <strong className="font-semibold">The problem.</strong> {problem}
      </p>
      <p className="mt-4">
        <strong className="font-semibold">My part.</strong> {part}
      </p>
      {screenshot ? (
        <Image
          src={screenshot.image}
          alt={screenshot.alt}
          className="mt-6 h-auto w-full rounded-md border border-underline"
        />
      ) : null}
    </article>
  );
}
