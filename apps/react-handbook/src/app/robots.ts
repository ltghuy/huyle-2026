import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// Every path may be crawled. /api/ stays crawlable because some pages fetch
// from it while they render; next.config sends X-Robots-Tag: noindex on API
// responses to keep them out of the index instead.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
