import { resume } from "@/resume/claims";
import { plumbFixUrl } from "./links";

type Organisation = (typeof resume.experience)[number]["organisation"];

export const experienceLinks: Partial<Record<Organisation, string>> = {
  "Plumb MCP": plumbFixUrl,
};
