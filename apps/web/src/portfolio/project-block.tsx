import Image from "next/image";
import type { Project } from "./projects";

export function ProjectBlock({ project }: { project: Project }) {
  const { name, summary, problem, part, links, screenshot } = project;
  return (
    <article>
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="mt-1 text-muted">{summary}</p>
      <p className="mt-4">
        <strong className="font-semibold">The problem.</strong> {problem}
      </p>
      <p className="mt-4">
        <strong className="font-semibold">My part.</strong> {part}
      </p>
      {links.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-sans text-base">
          {links.map(({ label, url }) => (
            <li key={url}>
              <a href={url} aria-label={`${name}: ${label}`}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {screenshot ? (
        <Image
          src={screenshot.image}
          alt={screenshot.alt}
          sizes="(min-width: 632px) 600px, calc(100vw - 32px)"
          className="mt-6 h-auto w-full rounded-md border border-underline"
        />
      ) : null}
    </article>
  );
}
