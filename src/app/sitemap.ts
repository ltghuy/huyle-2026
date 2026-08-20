import type { MetadataRoute } from "next";
import { profile } from "@/content/profile";

/**
 * Generates `/sitemap.xml` (Next 16 metadata route). The portfolio is a single
 * page — its sections are in-page anchors, not separate URLs — so the sitemap
 * has one entry for the home route. `lastModified` is stamped at build time.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: profile.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
