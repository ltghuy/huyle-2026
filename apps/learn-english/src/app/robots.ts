import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Every path may be crawled: pages fetch content from /api/ while they render,
// so next.config sends X-Robots-Tag: noindex on API responses instead of
// blocking them here.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
