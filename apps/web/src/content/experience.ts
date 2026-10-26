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
      "Naver Care (AI symptom triage) and Naver Healthcare (PHR home suite) · Vietnam & Korea",
    period: "Nov 2025 – Present",
    location: "Ho Chi Minh City, Vietnam",
    current: true,
    highlights: [
      "Core developer on Symptom Editor Admin, a drag-and-drop tool the clinical team uses to design and publish branching medical questionnaires themselves. Changes that used to take engineers several days are now self-service.",
      "Built authoring safeguards: validation that catches broken question paths, a simulation mode that previews the patient experience, and version history with a review-then-activate workflow.",
      "Delivered the user-facing Naver Care Symptom Checker, an adaptive questionnaire that keeps progress after a page refresh and serves both public and hospital-partner flows in Korean and English.",
      "Built the frontend for BodyReport (InBody), Naver Healthcare's first PHR product, and shipped it on time for the P1 launch.",
      "Led design-system standardization across a large multi-app codebase. Sister teams now use the shared component library.",
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
    context: "InjuryEx, a legal-tech and healthcare workflow platform with many stakeholders",
    period: "Feb 2024 – Nov 2025",
    location: "Remote",
    highlights: [
      "Bootstrapped InjuryEx from zero. I chose the frontend stack, architecture, and conventions, which later became team standards.",
      "Led the frontend team: sprint planning, estimation, mentoring, and code review.",
      "Designed workflows between patients, lawyers, doctors, and pharmacies, including automated ANZ and Xero payments with SMS/email notifications.",
      "Wrote internal VS Code extensions for recurring tasks, and worked full-stack (Python, FastAPI) when the team needed to move faster.",
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
      "Australian Epilepsy Project (Florey Institute), a government-funded diagnostic-imaging research platform",
    period: "Apr 2023 – Feb 2024",
    location: "Remote",
    highlights: [
      "Turned clinical requirements into production React features for a national epilepsy-diagnosis network.",
      "Integrated OHIF (Open Health Imaging Foundation) for viewing medical images.",
      "Built reusable components covered by unit, integration, and E2E tests.",
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
    context: "ETech, an enterprise conference and event-management platform",
    period: "Jan 2022 – Mar 2023",
    location: "Ho Chi Minh City, Vietnam",
    highlights: [
      "Delivered web and React Native features for a conference platform used by Burger King, Herbalife, JSEA, and Switch Production.",
      "Built real-time virtual meeting rooms over WebSocket, with live global stats.",
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
