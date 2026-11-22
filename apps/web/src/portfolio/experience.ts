import { resume } from "@/resume/claims";

export type Organisation = (typeof resume.experience)[number]["organisation"];

export const experienceLinks: Partial<Record<Organisation, string>> =
  resume.jobLinks;
