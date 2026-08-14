export interface Skill {
  name: string;
  /** simple-icons slug for a brand chip, when one exists */
  icon?: string;
}

export interface SkillGroup {
  /** Group id used for filtering */
  id: "frontend" | "ai-native" | "backend" | "quality";
  label: string;
  /** Short blurb for the group */
  blurb: string;
  items: Skill[];
}

export const skillGroups: SkillGroup[] = [
  {
    id: "frontend",
    label: "Frontend",
    blurb:
      "Building interactive, production-grade UIs — from RSC-streamed apps to design systems.",
    items: [
      { name: "React", icon: "react" },
      { name: "Next.js", icon: "nextdotjs" },
      { name: "TypeScript", icon: "typescript" },
      { name: "React Native", icon: "react" },
      { name: "Vue.js", icon: "vuedotjs" },
      { name: "Tailwind CSS", icon: "tailwindcss" },
      { name: "Redux Toolkit", icon: "redux" },
      { name: "TanStack Query", icon: "reactquery" },
      { name: "Zustand" },
      { name: "React Hook Form", icon: "reacthookform" },
      { name: "Ant Design", icon: "antdesign" },
      { name: "Material UI", icon: "mui" },
      { name: "React Flow" },
      { name: "Storybook", icon: "storybook" },
    ],
  },
  {
    id: "ai-native",
    label: "AI-Native",
    blurb:
      "Shipping AI/LLM-assisted product features and building with AI-native tooling.",
    items: [
      { name: "AI symptom matching" },
      { name: "AI-assisted authoring" },
      { name: "LLM report briefings" },
      { name: "Claude Code", icon: "anthropic" },
      { name: "Cursor" },
      { name: "GitHub Copilot", icon: "githubcopilot" },
    ],
  },
  {
    id: "backend",
    label: "Backend / APIs",
    blurb:
      "Full-stack when velocity requires — typed APIs, GraphQL, and monorepo tooling.",
    items: [
      { name: "Node.js", icon: "nodedotjs" },
      { name: "Fastify", icon: "fastify" },
      { name: "TypeBox" },
      { name: "Orval" },
      { name: "FastAPI", icon: "fastapi" },
      { name: "Python", icon: "python" },
      { name: "REST" },
      { name: "GraphQL", icon: "graphql" },
      { name: "Apollo", icon: "apollographql" },
      { name: "Auth0", icon: "auth0" },
      { name: "Turborepo", icon: "turborepo" },
    ],
  },
  {
    id: "quality",
    label: "Testing & Quality",
    blurb:
      "Owning the quality bar — automated testing, static analysis, and observability.",
    items: [
      { name: "Vitest", icon: "vitest" },
      { name: "Playwright", icon: "playwright" },
      { name: "React Testing Library", icon: "testinglibrary" },
      { name: "MSW" },
      { name: "SonarQube", icon: "sonarqube" },
      { name: "Docker", icon: "docker" },
      { name: "AWS", icon: "amazonwebservices" },
      { name: "Grafana", icon: "grafana" },
    ],
  },
];
