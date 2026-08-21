export interface Profile {
  /** Full legal name */
  name: string;
  /** Display / brand name */
  display: string;
  /** Professional title shown under the name */
  title: string;
  /** Short tagline / origin line */
  tagline: string;
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
  tagline: "From Vietnam 🇻🇳 · powered by coffee and one very opinionated cat",
  summary:
    "Frontend engineer with 4+ years turning fuzzy product specs into fast, accessible web platforms across healthcare, legal-tech, and enterprise-event domains — in React, Next.js (App Router, RSC, Streaming), and TypeScript. Technical lead and primary developer on core Naver Care tools, owning the work end-to-end from the first spec to production observability. I care a little too much about scalable monorepo architecture, design systems teams actually adopt, and weaving AI/LLM features in where they earn their keep — not just because the demo looked cool.",
  location: "Ho Chi Minh City, Vietnam",
  monogram: "HL",
  url: "https://huyle.work",
};
