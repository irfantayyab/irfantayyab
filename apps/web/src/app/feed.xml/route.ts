import { feedXml } from "@/writing/feed";
import { loadWriting } from "@/writing/load";

export const dynamic = "force-static";

export async function GET() {
  return new Response(feedXml(await loadWriting()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
