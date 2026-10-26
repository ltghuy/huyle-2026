import type { MetadataRoute } from "next";
import { profile } from "@/content/profile";

/**
 * Generates `/sitemap.xml` (Next 16 metadata route). The portfolio is a single
 * page — its sections are in-page anchors, not separate URLs — so the sitemap
 * has one entry for the home route. `lastModified` is the last real content
 * change (`profile.updated`), not the build time: Google only uses lastmod when
 * it is consistently accurate, and it ignores priority/changefreq entirely.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: profile.url,
      lastModified: profile.updated,
      images: [`${profile.url}/assets/evan.png`],
    },
  ];
}
