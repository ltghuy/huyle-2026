import type { MetadataRoute } from "next";
import { profile } from "@/content/profile";

/**
 * Generates `/robots.txt` (Next 16 metadata route). This is a public, single-page
 * portfolio, so every crawler — search engines and AI/LLM crawlers alike — is
 * allowed everywhere; the sitemap and canonical host are advertised for SEO.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${profile.url}/sitemap.xml`,
    host: profile.url,
  };
}
