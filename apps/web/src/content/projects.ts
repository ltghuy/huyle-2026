export interface ProjectLinks {
  demo?: string;
  source?: string;
}

export interface Project {
  id: string;
  /** Display index (rendered as 01, 02, …) */
  index: number;
  name: string;
  /** Role / company context */
  role: string;
  /** One-line impact statement */
  oneLiner: string;
  description: string;
  tech: string[];
  links: ProjectLinks;
}

/** How many cards the Projects grid shows (2 × 2). Slots without a project
 *  render as "coming soon" placeholders, so adding a project fills the next one. */
export const PROJECT_SLOTS = 4;

/**
 * Projects shown in the Work grid, in display order. The section renders links
 * only when present.
 */
export const projects: Project[] = [
  {
    id: "frontend-handbook",
    index: 1,
    name: "Frontend Handbook",
    role: "Personal project · learn.huyle.work",
    oneLiner:
      "Notes and builds for senior frontend engineers: hands-on React practices and the topics around them, each with a live demo.",
    description:
      "Classic UI problems built from scratch, such as toasts, infinite scroll, virtualized lists, and a data grid, plus the browser, performance, accessibility, security, system design, testing, and SEO topics around them. Every page pairs short notes with a live demo you can break on purpose.",
    tech: ["Next.js", "React", "Tailwind CSS"],
    links: { demo: "https://learn.huyle.work/" },
  },
];
