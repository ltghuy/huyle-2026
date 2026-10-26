export interface SkillGroup {
  /** Group id used for filtering */
  id: "frontend" | "ai-native" | "backend" | "quality";
  label: string;
}

export const skillGroups: SkillGroup[] = [
  {
    id: "frontend",
    label: "Frontend",
  },
  {
    id: "ai-native",
    label: "AI-Native",
  },
  {
    id: "backend",
    label: "Backend / APIs",
  },
  {
    id: "quality",
    label: "Testing & Quality",
  },
];
