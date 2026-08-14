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
}

export const profile: Profile = {
  name: "Le Tran Gia Huy",
  display: "Huy Le",
  title: "Software Engineer · AI-Native Development",
  tagline: "From Vietnam 🇻🇳",
  summary:
    "Frontend engineer with 4+ years building production-grade web platforms across healthcare, legal-tech, and enterprise-event domains in React, Next.js (App Router, RSC, Streaming), and TypeScript. Technical lead and primary developer on core Naver Care tools, with end-to-end ownership from product spec to production observability — focused on scalable monorepo architecture, design-system standardization, and integrating AI/LLM-assisted product features.",
  location: "Ho Chi Minh City, Vietnam",
  monogram: "HL",
};
