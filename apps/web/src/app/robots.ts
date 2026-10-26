import type { MetadataRoute } from "next";
import { profile } from "@/content/profile";

/**
 * Generates `/robots.txt` (Next 16 metadata route). This is a public, single-page
 * portfolio whose goal is maximum discoverability, so every crawler — search
 * engines and AI/LLM crawlers alike — is allowed everywhere (unlike the
 * Frontend Handbook, which opts out of AI training bots). The sitemap is
 * advertised for discovery.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${profile.url}/sitemap.xml`,
  };
}
