import { resume } from "@/resume/claims";

type Organisation = (typeof resume.experience)[number]["organisation"];

export const experienceLinks: Partial<Record<Organisation, string>> =
  resume.jobLinks;
