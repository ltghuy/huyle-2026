export interface Profile {
  /** Full legal name */
  name: string;
  /** Display / brand name */
  display: string;
  /** Professional title shown under the name */
  title: string;
  /** Longer professional summary (from CV) */
  summary: string;
  /** Current location */
  location: string;
  /** Monogram used by the nav */
  monogram: string;
  /** Canonical production URL, no trailing slash — the single source of truth
   *  for SEO metadata (`metadataBase`, canonical, OpenGraph), robots.txt, and
   *  the sitemap. */
  url: string;
}

export const profile: Profile = {
  name: "Le Tran Gia Huy",
  display: "Huy Le",
  title: "Software Engineer · AI-Native Development",
  summary:
    "Frontend engineer with 4+ years of turning fuzzy product specs into fast, accessible web platforms for healthcare, legal-tech, and enterprise events, using React, Next.js (App Router, RSC, Streaming), and TypeScript. I'm the technical lead and primary developer on core Naver Care tools and own the work from the first spec to production monitoring. I care a little too much about monorepo architecture that scales, design systems other teams want to use, and adding AI/LLM features where they solve a real problem for users.",
  location: "Ho Chi Minh City, Vietnam",
  monogram: "HL",
  url: "https://huyle.work",
};
