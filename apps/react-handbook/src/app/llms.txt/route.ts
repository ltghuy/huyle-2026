import { llmsTxt } from "@/lib/llms-txt";

// Built once at build time from the catalog, like the sitemap.
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
