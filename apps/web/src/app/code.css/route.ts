import { codeStyles } from "@/writing/code";

export const dynamic = "force-static";

export async function GET() {
  return new Response(await codeStyles(), {
    headers: { "Content-Type": "text/css; charset=utf-8" },
  });
}
