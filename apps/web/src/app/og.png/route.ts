import { renderCard } from "@/app/card";
import { resume } from "@/resume/claims";
import { siteUrl } from "@/site";

export const dynamic = "force-static";

export function GET() {
  return renderCard({
    title: resume.name,
    subtitle: resume.headline,
    footer: new URL(siteUrl).host,
  });
}
