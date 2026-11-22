import type { ProjectTabId } from "@/app/page-ids";
import { resume } from "@/resume/claims";
import type { Organisation } from "./experience";
import { jobTabs } from "./job-tabs";
import { projectId, projects, type Project } from "./projects";

export type ProjectTab = {
  id: ProjectTabId;
  label: string;
  projects: readonly Project[];
};

const featuredTab = { id: "featured", label: "Featured" } as const;
const openSourceTab = { id: "open-source", label: "Open Source" } as const;
const personalTab = { id: "personal", label: "Personal" } as const;

export function projectTabId({ group, featured }: Project): ProjectTabId {
  if (featured) {
    return featuredTab.id;
  }
  if (group === "open-source") {
    return openSourceTab.id;
  }
  if (group === "personal") {
    return personalTab.id;
  }
  return jobTabs[group.job].id;
}

export function buildProjectTabs(
  all: readonly Project[],
): readonly ProjectTab[] {
  const jobs = [
    ...new Set(resume.experience.map(({ organisation }) => organisation)),
  ].map((organisation) => jobTabs[organisation]);
  return [featuredTab, ...jobs, openSourceTab, personalTab]
    .map(({ id, label }) => ({
      id,
      label,
      projects: all.filter((project) => projectTabId(project) === id),
    }))
    .filter((tab) => tab.projects.length > 0);
}

export function tabTargets(
  tabs: readonly ProjectTab[],
): Readonly<Record<string, ProjectTabId>> {
  return Object.fromEntries(
    tabs.flatMap((tab) => [
      [tab.id, tab.id],
      ...tab.projects.map((project) => [projectId(project), tab.id]),
    ]),
  );
}

export const projectTabs = buildProjectTabs(projects);

export type JobLinks = {
  name?: string;
  host?: { url: string; label: string };
};

export function jobLinks(
  organisation: Organisation,
  outside: string | undefined,
  tabs: readonly ProjectTab[] = projectTabs,
): JobLinks {
  const tab = jobTabId(organisation, tabs);
  if (!tab) {
    return outside ? { name: outside } : {};
  }
  return outside
    ? {
        name: `#${tab}`,
        host: {
          url: outside,
          label: new URL(outside).hostname.replace(/^www\./, ""),
        },
      }
    : { name: `#${tab}` };
}

export function jobTabId(
  organisation: Organisation,
  tabs: readonly ProjectTab[] = projectTabs,
): ProjectTabId | undefined {
  const { id } = jobTabs[organisation];
  return tabs.some((tab) => tab.id === id) ? id : undefined;
}
