import { loadWriting } from "@/writing/load";
import { fixedRedirects, redirectsFile } from "./redirects";

export const dynamic = "force-static";

export async function GET() {
  const { redirects } = await loadWriting();
  return new Response(redirectsFile([...fixedRedirects, ...redirects]), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
