import type { MetadataRoute } from "next";

import { tokensFor } from "@/lib/ai-bots";
import { SITE_URL } from "@/lib/site";

// Every path may be crawled. /api/ stays crawlable because some pages fetch
// from it while they render; next.config sends X-Robots-Tag: noindex on API
// responses to keep them out of the index instead.
//
// AI crawlers: pages may be fetched for AI search answers and for a user's
// request, but not collected for model training. A bot with its own group
// ignores the "*" group, so the search bots get an explicit Allow.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: tokensFor("training", "control"), disallow: "/" },
      { userAgent: tokensFor("search", "user"), allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
