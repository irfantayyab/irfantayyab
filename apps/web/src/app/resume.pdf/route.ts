import { readFile } from "node:fs/promises";
import { resumePdfPath } from "@/resume/source";

export const dynamic = "force-static";

export async function GET() {
  const pdf = new Uint8Array(await readFile(resumePdfPath));
  return new Response(pdf, {
    headers: { "Content-Type": "application/pdf" },
  });
}
