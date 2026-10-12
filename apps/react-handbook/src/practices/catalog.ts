// Client-safe handbook metadata: the sections, the React Practices section's
// practices, and the topic pages of the other sections. A built practice sets
// `built: true` here and adds its own route at
// app/(playground)/react-practices/{slug}/page.tsx, so Next code-splits each
// practice. Unbuilt practices fall through to [slug]. Each topic page has its
// own route under app/(playground)/{section path}/{slug}/page.tsx.

export const SITE_NAME = "Frontend Handbook";

export type SectionId = "react-practices" | "browser-platform" | "performance-accessibility" | "security" | "system-design";

export type Section = {
  id: SectionId;
  title: string;
  summary: string;
  /** Null until the section has content (shown as coming soon). */
  href: string | null;
};

export const PRACTICES_PATH = "/react-practices";
export const BROWSER_PATH = "/browser-platform";
export const PERF_A11Y_PATH = "/performance-accessibility";
export const SECURITY_PATH = "/security";
export const SYSTEM_DESIGN_PATH = "/system-design";

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
    href: BROWSER_PATH,
  },
  {
    id: "performance-accessibility",
    title: "Performance & Accessibility",
    summary: "Measuring and fixing Core Web Vitals, profiling and bundle size, and building for keyboard and screen-reader users.",
    href: PERF_A11Y_PATH,
  },
  {
    id: "security",
    title: "Security",
    summary: "How a web app proves who is calling and keeps it that way: tokens and sessions first, with XSS, CSP and CSRF to follow.",
    href: SECURITY_PATH,
  },
  {
    id: "system-design",
    title: "Frontend System Design",
    summary: "How to run a frontend design: scope the requirements, shape an architecture and data model, choose the trade-offs, then apply it to a news feed, autocomplete, chat or design system.",
    href: SYSTEM_DESIGN_PATH,
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
    built: true,
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

// Topic pages of the sections other than React Practices. Slugs are unique
// across sections; `written` turns true once a page's content ships.

export type TopicSectionId = Exclude<SectionId, "react-practices">;

export type TopicPageMeta = {
  section: TopicSectionId;
  slug: string;
  title: string;
  summary: string;
  written: boolean;
};

export const topicPages = [
  {
    section: "browser-platform",
    slug: "networking",
    title: "Networking",
    summary: "How a request reaches the server and back: DNS, TCP, TLS, HTTP messages and caching, HTTP/1.1 to HTTP/3, and what HTTPS protects, each with a live demo.",
    written: true,
  },
  {
    section: "browser-platform",
    slug: "origins-and-cors",
    title: "Origins, DNS and CORS",
    summary: "The parts of a URL, how DNS finds a host, what an origin and a site are, and how CORS lets a server share responses across origins, each with a live demo.",
    written: true,
  },
  {
    section: "browser-platform",
    slug: "rendering",
    title: "How the browser renders a page",
    summary: "Parsing into the DOM and CSSOM, what blocks parsing and rendering, layout, paint and composite, and layout thrashing, each with a live demo.",
    written: true,
  },
  {
    section: "performance-accessibility",
    slug: "performance",
    title: "Performance",
    summary: "Core Web Vitals, HTML delivery and CDNs, the critical path, images, fonts, code splitting and web workers, each with a live demo.",
    written: true,
  },
  {
    section: "performance-accessibility",
    slug: "accessibility",
    title: "Accessibility",
    summary: "Semantic HTML and ARIA, structure, keyboard focus, dynamic content, images and media, contrast, type, motion, forms and inclusive design, each with a live demo.",
    written: true,
  },
  {
    section: "security",
    slug: "jwt",
    title: "JSON Web Tokens",
    summary: "What a JWT proves and who can read it, the verifier mistakes behind real attacks, expiry, refresh and revocation, where to keep tokens in the browser, and key rotation, each with a live demo.",
    written: true,
  },
  {
    section: "security",
    slug: "xss-csp-csrf",
    title: "XSS, CSP and CSRF",
    summary: "How untrusted content becomes running script and how encoding stops it, what a Content-Security-Policy does as a second wall, and how another site makes a request as the logged-in user, each with a live demo.",
    written: true,
  },
  {
    section: "system-design",
    slug: "method",
    title: "The design method",
    summary: "A repeatable way to run any frontend design prompt: clarify requirements, shape the architecture and data model, define the interface, go deep on the hard parts, and defend the trade-offs \u2014 with interactive references.",
    written: true,
  },
  {
    section: "system-design",
    slug: "news-feed",
    title: "Design a news feed",
    summary: "The method applied end to end to an infinite, personalised feed: requirements and architecture, the data model and why feeds need cursor pagination, and the deep dives \u2014 virtualization, media, optimistic likes and freshness.",
    written: true,
  },
] as const satisfies readonly TopicPageMeta[];

export type TopicPage = (typeof topicPages)[number];
export type TopicSlug = TopicPage["slug"];

const SECTION_PATH: Record<TopicSectionId, string> = {
  "browser-platform": BROWSER_PATH,
  "performance-accessibility": PERF_A11Y_PATH,
  security: SECURITY_PATH,
  "system-design": SYSTEM_DESIGN_PATH,
};

export function sectionPath(id: TopicSectionId) {
  return SECTION_PATH[id];
}

export function sectionPages(id: TopicSectionId): TopicPage[] {
  return topicPages.filter((p) => p.section === id);
}

export function getTopicPage(slug: TopicSlug): TopicPage {
  return topicPages.find((p) => p.slug === slug)!;
}

export function topicHref(slug: TopicSlug) {
  const page = getTopicPage(slug);
  return `${SECTION_PATH[page.section]}/${slug}`;
}

export function topicMetadata(slug: TopicSlug) {
  const page = getTopicPage(slug);
  return { title: page.title, description: page.summary };
}

/** How much of a section has content, for its home card. Null for coming-soon sections. */
export function sectionProgress(id: SectionId): { done: number; total: number; noun: string } | null {
  if (id === "react-practices") return { done: builtCount, total: practices.length, noun: "practices built" };
  const pages = sectionPages(id);
  return { done: pages.filter((p) => p.written).length, total: pages.length, noun: pages.length === 1 ? "page written" : "pages written" };
}
