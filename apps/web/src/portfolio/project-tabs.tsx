import { homeSectionIds } from "@/app/page-ids";
import { ProjectBlock } from "./project-block";
import { ProjectTabBar } from "./project-tab-bar";
import { projectTabs, tabTargets } from "./tabs";

const anyPanelTargeted = ".project-panel:target, .project-panel :target";

function activeTabStyles(ids: readonly string[], defaultId: string) {
  const link = (id: string) => `.project-tab-link[href="#${id}"]`;
  return [
    `.project-tabs:not(:has(${anyPanelTargeted})) ${link(defaultId)}`,
    ...ids.map(
      (id) => `.project-tabs:has(#${id}:target, #${id} :target) ${link(id)}`,
    ),
  ]
    .map(
      (selector) =>
        `${selector} { color: var(--ink); box-shadow: inset 0 -2px 0 var(--ink); }`,
    )
    .join("\n");
}

export function ProjectTabs() {
  const tabs = projectTabs;
  const defaultId = tabs[0]?.id ?? "featured";
  return (
    <section
      aria-labelledby={homeSectionIds.projects}
      className="project-tabs mt-16"
    >
      <style href="project-tabs" precedence="default">
        {activeTabStyles(
          tabs.map(({ id }) => id),
          defaultId,
        )}
      </style>
      <h2
        id={homeSectionIds.projects}
        className="text-2xl font-semibold tracking-tight"
      >
        Projects
      </h2>
      <ProjectTabBar
        tabs={tabs.map(({ id, label }) => ({ id, label }))}
        defaultId={defaultId}
        targets={tabTargets(tabs)}
      />
      {tabs.map(({ id, label, projects }) => (
        <section
          key={id}
          id={id}
          aria-label={label}
          className="project-panel pt-8"
          data-default={id === defaultId ? "" : undefined}
        >
          <div className="divide-y divide-underline">
            {projects.map((project) => (
              <ProjectBlock key={project.name} project={project} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
