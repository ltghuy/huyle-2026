// Client-safe handbook metadata: the sections, and the React Practices
// section's practices. A built practice sets `built: true` here and adds its
// own route at app/(playground)/react-practices/{slug}/page.tsx, so Next
// code-splits each practice. Unbuilt practices fall through to [slug].

export const SITE_NAME = "Frontend Handbook";

export type SectionId = "react-practices" | "browser-platform" | "performance-accessibility" | "system-design";

export type Section = {
  id: SectionId;
  title: string;
  summary: string;
  /** Null until the section has content (shown as coming soon). */
  href: string | null;
};

export const PRACTICES_PATH = "/react-practices";

export const sections: Section[] = [
  {
    id: "react-practices",
    title: "React Practices",
    summary: "Fourteen classic UI problems built from scratch, with the reasoning behind each: notifications, infinite lists, forms, caching, real-time and more.",
    href: PRACTICES_PATH,
  },
  {
    id: "browser-platform",
    title: "Browser & Web Platform",
    summary: "How a page is loaded, rendered and secured: the rendering pipeline, networking and caching, storage, and XSS, CSP and CORS.",
    href: null,
  },
  {
    id: "performance-accessibility",
    title: "Performance & Accessibility",
    summary: "Measuring and fixing Core Web Vitals, profiling and bundle size, and building for keyboard and screen-reader users.",
    href: null,
  },
  {
    id: "system-design",
    title: "Frontend System Design",
    summary: "Design a news feed, autocomplete, chat or design system from requirements through, architecture and trade-offs.",
    href: null,
  },
];

export function practiceHref(slug: string) {
  return `${PRACTICES_PATH}/${slug}`;
}

export type PracticeMeta = {
  slug: string;
  number: number;
  title: string;
  summary: string;
  built: boolean;
};

export const practices = [
  {
    slug: "toast-notifications",
    number: 1,
    title: "Toast / Notification System",
    summary: "Queued, auto-dismissing notifications with pause on hover and stacking.",
    built: true,
  },
  {
    slug: "searchable-accordion",
    number: 2,
    title: "Searchable Accordion",
    summary: "Expandable sections filtered by a search query, with match highlighting.",
    built: true,
  },
  {
    slug: "infinite-scroll",
    number: 3,
    title: "Infinite Scroll",
    summary: "Load the next page as the user nears the end of the list.",
    built: true,
  },
  {
    slug: "data-fetching-hook",
    number: 4,
    title: "Custom Data-Fetching Hook with Caching",
    summary: "A reusable fetch hook with caching, deduplication, and stale data handling.",
    built: true,
  },
  {
    slug: "realtime-chat",
    number: 5,
    title: "Real-Time Chat UI",
    summary: "Live message stream with optimistic sends and auto-scroll.",
    built: true,
  },
  {
    slug: "file-upload",
    number: 6,
    title: "File Upload with Progress",
    summary: "Drag-and-drop uploads with per-file progress, cancel, and retry.",
    built: true,
  },
  {
    slug: "virtualized-list",
    number: 7,
    title: "Virtualized Large Lists",
    summary: "Render only the visible rows of a very large list.",
    built: true,
  },
  {
    slug: "accessible-modal",
    number: 8,
    title: "Accessible Modal",
    summary: "A dialog with focus trap, Escape to close, and focus restore.",
    built: true,
  },
  {
    slug: "context-reducer",
    number: 9,
    title: "Context + useReducer State Management",
    summary: "App state with a reducer, typed actions, and context without extra re-renders.",
    built: true,
  },
  {
    slug: "multi-step-form",
    number: 10,
    title: "Multi-Step Form",
    summary: "A wizard with per-step validation, back navigation, and a review step.",
    built: true,
  },
  {
    slug: "lazy-images",
    number: 11,
    title: "Lazy-Loaded Images",
    summary: "Load images only when they approach the viewport, with placeholders.",
    built: true,
  },
  {
    slug: "debounced-search",
    number: 12,
    title: "Debounced Search + API Cache",
    summary: "Search-as-you-type that debounces input, caches results, and drops stale responses.",
    built: true,
  },
  {
    slug: "data-grid",
    number: 13,
    title: "Advanced Data Grid",
    summary: "Sorting, filtering, pagination, column resizing, and row selection.",
    built: true,
  },
  {
    slug: "large-dataset-performance",
    number: 14,
    title: "Large Dataset Performance Optimization",
    summary: "Measure and fix slow renders on big datasets, naive vs optimized.",
    built: false,
  },
] as const satisfies readonly PracticeMeta[];

export const builtCount = practices.filter((p) => p.built).length;

export type Practice = (typeof practices)[number];
export type PracticeSlug = Practice["slug"];

const bySlug = new Map<string, Practice>(practices.map((p) => [p.slug, p]));

export function getPractice(slug: string): Practice | undefined {
  return bySlug.get(slug);
}

export function practiceMetadata(slug: PracticeSlug) {
  const practice = getPractice(slug)!;
  return { title: practice.title, description: practice.summary };
}
