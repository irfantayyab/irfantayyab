import type { ProjectTabId } from "@/app/page-ids";
import type { Organisation } from "./experience";

export type JobTab = {
  id: ProjectTabId;
  label: string;
};

export const jobTabs = {
  "AmentoTech Pvt Ltd": { id: "amentotech", label: "AmentoTech" },
  "Sprouto Group": { id: "sprouto", label: "Sprouto" },
  "CodeFlamme Pvt Ltd": { id: "codeflamme", label: "CodeFlamme" },
} as const satisfies Record<Organisation, JobTab>;
