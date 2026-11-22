import { describe, expect, it } from "vitest";
import {
  homeSectionIds,
  isPageId,
  mainId,
  projectTabIds,
} from "@/app/page-ids";
import { projectHeading, projectId, projects, type Project } from "./projects";
import {
  buildProjectTabs,
  jobLinks,
  jobTabId,
  projectTabs,
  tabTargets,
} from "./tabs";

function project(name: string, fields: Partial<Project> = {}): Project {
  return {
    name,
    summary: "",
    part: "",
    stack: [],
    links: [],
    group: "personal",
    ...fields,
  };
}

describe("buildProjectTabs", () => {
  const fakes = [
    project("Open Thing", { group: "open-source" }),
    project("Side Thing"),
    project("Job Thing", { group: { job: "Sprouto Group" } }),
    project("Best Job Thing", {
      group: { job: "CodeFlamme Pvt Ltd" },
      featured: true,
    }),
    project("Best Side Thing", { featured: true }),
  ];

  it("orders the tabs Featured, the jobs as Experience lists them, Open Source, Personal, and leaves out an empty one", () => {
    expect(buildProjectTabs(fakes).map(({ id }) => id)).toEqual([
      "featured",
      "sprouto",
      "open-source",
      "personal",
    ]);
  });

  it("puts a featured project in Featured alone, in the order given", () => {
    const tabs = buildProjectTabs(fakes);
    expect(tabs[0]?.projects.map(({ name }) => name)).toEqual([
      "Best Job Thing",
      "Best Side Thing",
    ]);
    expect(
      tabs.flatMap((tab) => tab.projects).map(({ name }) => name),
    ).toHaveLength(fakes.length);
  });

  it("starts with the first tab that has a project when none is featured", () => {
    expect(
      buildProjectTabs([project("Side Thing")]).map(({ id }) => id),
    ).toEqual(["personal"]);
  });
});

describe("jobTabId", () => {
  it("leads a job to its tab only while the tab is shown", () => {
    const tabs = buildProjectTabs([
      project("Job Thing", { group: { job: "Sprouto Group" } }),
    ]);
    expect(jobTabId("Sprouto Group", tabs)).toBe("sprouto");
    expect(jobTabId("CodeFlamme Pvt Ltd", tabs)).toBeUndefined();
  });
});

describe("jobLinks", () => {
  const tabs = buildProjectTabs([
    project("Job Thing", { group: { job: "Sprouto Group" } }),
  ]);

  it("leads a job with a tab to it, and gives its outside link its host", () => {
    expect(
      jobLinks("Sprouto Group", "https://www.example.com/a", tabs),
    ).toEqual({
      name: "#sprouto",
      host: { url: "https://www.example.com/a", label: "example.com" },
    });
  });

  it("leads a job with a tab and no outside link to its tab alone", () => {
    expect(jobLinks("Sprouto Group", undefined, tabs)).toEqual({
      name: "#sprouto",
    });
  });

  it("leads a job without a tab to its outside link, or nowhere", () => {
    expect(jobLinks("CodeFlamme Pvt Ltd", "https://example.com", tabs)).toEqual(
      { name: "https://example.com" },
    );
    expect(jobLinks("CodeFlamme Pvt Ltd", undefined, tabs)).toEqual({});
  });
});

describe("tabTargets", () => {
  it("leads each tab's id and each of its projects' ids to the tab", () => {
    expect(
      tabTargets(
        buildProjectTabs([
          project("irfantayyab.com"),
          project("Plumb MCP", { group: "open-source" }),
        ]),
      ),
    ).toEqual({
      "open-source": "open-source",
      "plumb-mcp": "open-source",
      personal: "personal",
      "irfantayyab-com": "personal",
    });
  });
});

describe("projectHeading", () => {
  it("names where a featured job's work was done, and marks open source", () => {
    expect(
      [
        project("A", { group: { job: "AmentoTech Pvt Ltd" }, featured: true }),
        project("B", { group: { job: "AmentoTech Pvt Ltd" } }),
        project("C", { group: "open-source" }),
        project("D", { featured: true }),
      ].map(projectHeading),
    ).toEqual(["AmentoTech: A", "B", "Open source: C", "D"]);
  });
});

describe("the projects' tabs", () => {
  it("hold every project once", () => {
    expect(
      projectTabs
        .flatMap((tab) => tab.projects)
        .map(({ name }) => name)
        .sort(),
    ).toEqual(projects.map(({ name }) => name).sort());
  });

  it("start with Featured", () => {
    expect(projectTabs[0]?.id).toBe("featured");
  });

  it("use only reserved ids", () => {
    for (const { id } of projectTabs) {
      expect(projectTabIds).toContain(id);
      expect(isPageId(id)).toBe(true);
    }
  });

  it("give every tab and project an id of its own on the page", () => {
    const ids = [
      mainId,
      ...Object.values(homeSectionIds),
      ...projectTabs.map(({ id }) => id),
      ...projects.map(projectId),
    ];
    expect(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
