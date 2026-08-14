export interface ExperienceItem {
  company: string;
  role: string;
  /** Short project/context line */
  context: string;
  period: string;
  location: string;
  highlights: string[];
  tech: string[];
  /** true while this is the current role */
  current?: boolean;
}

export const experience: ExperienceItem[] = [
  {
    company: "Naver Vietnam",
    role: "Frontend Engineer",
    context:
      "Naver Care (AI symptom-triage) & Naver Healthcare (PHR home suite) — Vietnam & Korea",
    period: "Nov 2025 – Present",
    location: "Ho Chi Minh City, Vietnam",
    current: true,
    highlights: [
      "Key member building Symptom Editor Admin — a visual drag-and-drop tool letting the clinical team design & publish branching medical questionnaires themselves, turning multi-day engineering requests into self-service.",
      "Built authoring safeguards: validation catching broken question paths, a simulation mode previewing the patient experience, and version history with a review-then-activate workflow.",
      "Delivered the user-facing Naver Care Symptom Checker — an adaptive questionnaire with resume-after-refresh progress, serving public + hospital-partner flows in Korean & English.",
      "Delivered frontend for Naver Healthcare's first PHR product, BodyReport (InBody), shipped on time for the P1 launch.",
      "Drove design-system standardization across a large multi-app codebase — a shared component library adopted by sister teams.",
    ],
    tech: [
      "Next.js 15/16",
      "React 19",
      "TypeScript",
      "React Flow",
      "Redux Toolkit",
      "TanStack Query",
      "Apollo GraphQL",
      "Ant Design",
      "Turborepo",
      "Vitest",
      "Playwright",
    ],
  },
  {
    company: "PTN Global",
    role: "Frontend Engineer / Team Lead",
    context: "InjuryEx — multi-stakeholder legal-tech & healthcare workflow platform",
    period: "Feb 2024 – Nov 2025",
    location: "Remote",
    highlights: [
      "Bootstrapped InjuryEx from zero — defined the frontend stack, architecture, and conventions later adopted as team standards.",
      "Led the frontend team: sprint planning, estimation, mentorship, and code-review culture across a multi-party domain.",
      "Designed solutions for complex patient/lawyer/doctor/pharmacy workflows, incl. automated ANZ & Xero payments with SMS/email notifications.",
      "Authored internal VSCode extensions standardizing recurring tasks; contributed full-stack (Python, FastAPI) when velocity required.",
    ],
    tech: [
      "Next.js",
      "TypeScript",
      "Redux Toolkit",
      "Material UI",
      "TanStack Query",
      "React Hook Form",
      "Auth0",
      "AWS",
      "Python",
      "FastAPI",
    ],
  },
  {
    company: "PTN Global",
    role: "Frontend Engineer",
    context:
      "Australian Epilepsy Project (Florey Institute) — government-funded diagnostic-imaging research platform",
    period: "Apr 2023 – Feb 2024",
    location: "Remote",
    highlights: [
      "Translated clinical requirements into production-grade React features for a national epilepsy-diagnosis network.",
      "Integrated OHIF (Open Health Imaging Foundation) for advanced medical-imaging visualization.",
      "Built reusable components with unit/integration/E2E coverage.",
    ],
    tech: [
      "React.js",
      "TypeScript",
      "Redux Toolkit",
      "Material UI",
      "OHIF",
      "TanStack Query",
      "Auth0",
      "AWS",
    ],
  },
  {
    company: "Skyblaze Studios",
    role: "Frontend Engineer",
    context: "ETech — enterprise conference & event-management platform",
    period: "Jan 2022 – Mar 2023",
    location: "Ho Chi Minh City, Vietnam",
    highlights: [
      "Delivered web & React Native features for a conference platform used by Burger King, Herbalife, JSEA, and Switch Production.",
      "Implemented WebSocket-based real-time virtual meeting rooms with live global stats.",
      "Built a reusable Vue component library.",
    ],
    tech: [
      "Vue.js",
      "TypeScript",
      "TailwindCSS",
      "Zustand",
      "WebSocket",
      "React Native",
      "i18n",
      "AWS",
    ],
  },
];
