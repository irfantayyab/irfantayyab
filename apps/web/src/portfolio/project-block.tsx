import Image from "next/image";
import { linkTarget } from "@/app/link-target";
import { ProjectName } from "./project-name";
import { projectScreenshots } from "./project-screenshots";
import { projectId, type Project } from "./projects";

export function ProjectBlock({ project }: { project: Project }) {
  const { name, summary, part, stack, links } = project;
  const screenshot = projectScreenshots[name];
  return (
    <article
      id={projectId(project)}
      className="project-block py-10 first:pt-0 last:pb-0"
    >
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h3 className="text-xl font-semibold">
          <ProjectName project={project} />
        </h3>
        {links.length > 0 ? (
          <ul className="flex -translate-y-px flex-wrap gap-x-4 font-sans text-base">
            {links.map(({ label, url }) => (
              <li key={url}>
                <a
                  href={url}
                  aria-label={`${name}: ${label}`}
                  {...linkTarget(url)}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p className="mt-1 text-muted">{summary}</p>
      <ul
        aria-label={`${name}: stack`}
        className="mt-4 flex flex-wrap gap-2 font-sans text-sm"
      >
        {stack.map((item) => (
          <li
            key={item}
            className="rounded-full border border-underline px-2.5 py-0.5 text-muted"
          >
            {item}
          </li>
        ))}
      </ul>
      {screenshot ? (
        <Image
          src={screenshot.image}
          alt={screenshot.alt}
          className="mt-6 h-auto w-full rounded-md border border-underline"
        />
      ) : null}
      <details className="project-details mt-5">
        <summary className="cursor-pointer font-sans text-base text-muted hover:text-ink">
          My part
          <span className="sr-only">: {name}</span>
        </summary>
        <p className="mt-4">{part}</p>
      </details>
    </article>
  );
}
