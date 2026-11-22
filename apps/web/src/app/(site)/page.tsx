import type { Metadata } from "next";
import { experienceLinks } from "@/portfolio/experience";
import { introLine } from "@/portfolio/intro";
import {
  javascriptInfoUrl,
  plumbFixUrl,
  portfolioRepoUrl,
} from "@/portfolio/links";
import { ContactLinks } from "@/portfolio/contact-links";
import { ProjectTabs } from "@/portfolio/project-tabs";
import { jobLinks } from "@/portfolio/tabs";
import { resume } from "@/resume/claims";
import { linkTarget } from "@/app/link-target";
import { homeSectionIds } from "@/app/page-ids";
import { homeDescription, pageMetadata } from "@/app/page-metadata";

export const metadata: Metadata = pageMetadata({
  path: "/",
  description: homeDescription,
});

export default function HomePage() {
  return (
    <>
      <div className="grid gap-x-6 sm:grid-cols-[1fr_auto]">
        <h1 className="text-4xl/tight font-semibold tracking-tight sm:col-start-1 sm:row-start-1">
          {resume.name}
        </h1>
        <p className="mt-2 font-sans text-base text-muted sm:col-start-1 sm:row-start-2">
          {resume.headline}
        </p>
        <ContactLinks className="mt-4 justify-between gap-x-1 sm:col-start-2 sm:row-start-1 sm:mt-0 sm:justify-start sm:gap-x-4 sm:self-center" />
      </div>

      <div className="mt-10 space-y-5">
        <p>{introLine}</p>
        <p>
          I taught myself to build for the web from what others shared for free:
          open-source code, documentation, answers and articles, and most of all{" "}
          <a href={javascriptInfoUrl} {...linkTarget(javascriptInfoUrl)}>
            javascript.info
          </a>
          , where I learned JavaScript. I try to give back in kind, by
          contributing to open-source projects like{" "}
          <a href={plumbFixUrl} {...linkTarget(plumbFixUrl)}>
            Plumb MCP
          </a>{" "}
          and writing up what I learn.
        </p>
        <p>
          I care about software that stays easy to change: typed code, real
          tests, and checks that pass before anything ships. This site is built
          that way, in the open. Its source is on{" "}
          <a href={portfolioRepoUrl} {...linkTarget(portfolioRepoUrl)}>
            GitHub
          </a>
          .
        </p>
      </div>

      <section aria-labelledby={homeSectionIds.experience} className="mt-16">
        <h2
          id={homeSectionIds.experience}
          className="text-2xl font-semibold tracking-tight"
        >
          Experience
        </h2>
        <ul className="mt-6 space-y-3">
          {resume.experience.map(({ title, organisation, dates }) => {
            const { name, host } = jobLinks(
              organisation,
              experienceLinks[organisation],
            );
            return (
              <li
                key={`${title}, ${organisation}`}
                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span>
                  {title},{" "}
                  {name ? (
                    <a href={name} {...linkTarget(name)}>
                      {organisation}
                    </a>
                  ) : (
                    organisation
                  )}
                  {host ? (
                    <>
                      {" "}
                      (
                      <a href={host.url} {...linkTarget(host.url)}>
                        {host.label}
                      </a>
                      )
                    </>
                  ) : null}
                </span>{" "}
                <span className="shrink-0 font-sans text-base text-muted">
                  {dates}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <ProjectTabs />
    </>
  );
}
