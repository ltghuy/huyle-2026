export interface ProjectLinks {
  demo?: string;
  source?: string;
}

export interface Project {
  id: string;
  /** Display index 1–4 (rendered as 01–04) */
  index: number;
  name: string;
  /** Role / company context */
  role: string;
  period: string;
  /** One-line impact statement */
  oneLiner: string;
  description: string;
  tech: string[];
  links: ProjectLinks;
  /** Optional preview image path under /public */
  preview?: string;
}

/**
 * Four spotlighted professional projects. These are proprietary products, so
 * most have no public demo/source — the Work section renders links only when
 * present (AC-012).
 */
export const projects: Project[] = [
  {
    id: "naver-care",
    index: 1,
    name: "Naver Care",
    role: "Frontend Engineer · Naver Vietnam",
    period: "2025 – Present",
    oneLiner:
      "AI symptom-triage: a visual editor that lets clinicians publish branching questionnaires themselves.",
    description:
      "Core tools for Naver's AI symptom-triage product. Built the Symptom Editor Admin — a drag-and-drop authoring tool with path validation, a patient-preview simulation mode, and review-then-activate version history — plus the user-facing adaptive Symptom Checker serving public and hospital-partner flows in Korean & English.",
    tech: ["Next.js", "React 19", "TypeScript", "React Flow", "Apollo GraphQL", "Ant Design"],
    links: {},
  },
  {
    id: "injuryex",
    index: 2,
    name: "InjuryEx",
    role: "Frontend Engineer / Team Lead · PTN Global",
    period: "2024 – 2025",
    oneLiner:
      "Multi-stakeholder legal-tech platform bootstrapped from zero and led to team standard.",
    description:
      "A legal-tech & healthcare workflow platform coordinating patients, lawyers, doctors, and pharmacies. Defined the frontend stack and conventions, led the team, and designed complex multi-party workflows including automated ANZ & Xero payments with SMS/email notifications.",
    tech: ["Next.js", "TypeScript", "Redux Toolkit", "Material UI", "Auth0", "FastAPI"],
    links: {},
  },
  {
    id: "aep",
    index: 3,
    name: "Australian Epilepsy Project",
    role: "Frontend Engineer · PTN Global (Florey Institute)",
    period: "2023 – 2024",
    oneLiner:
      "Government-funded diagnostic-imaging platform for a national epilepsy-diagnosis network.",
    description:
      "Translated clinical requirements into production-grade React features for a national epilepsy-diagnosis network, integrating OHIF for advanced medical-imaging visualization with full unit/integration/E2E coverage.",
    tech: ["React.js", "TypeScript", "Redux Toolkit", "OHIF", "Material UI", "AWS"],
    links: {},
  },
  {
    id: "etech",
    index: 4,
    name: "ETech",
    role: "Frontend Engineer · Skyblaze Studios",
    period: "2022 – 2023",
    oneLiner:
      "Enterprise conference platform with real-time virtual rooms, used by Burger King & Herbalife.",
    description:
      "Web & React Native features for a conference & event-management platform used by Burger King, Herbalife, JSEA, and Switch Production. Implemented WebSocket-based real-time virtual meeting rooms with live global stats and a reusable Vue component library.",
    tech: ["Vue.js", "TypeScript", "TailwindCSS", "WebSocket", "React Native", "AWS"],
    links: {},
  },
];
