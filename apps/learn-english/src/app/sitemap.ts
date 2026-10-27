import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the indexable pages: the ones that show course content to anyone.
// Pages with the learner's own data and the focus screens are noindex.
const PATHS = ["/", "/vocabulary", "/grammar", "/exercises", "/credits"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
