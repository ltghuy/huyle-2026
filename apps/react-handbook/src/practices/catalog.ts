// Client-safe handbook metadata: the sections, the React Practices section's
// practices, and the topic pages of the other sections. A built practice sets
// `built: true` here and adds its own route at
// app/(playground)/react-practices/{slug}/page.tsx, so Next code-splits each
// practice. Unbuilt practices fall through to [slug]. Each topic page has its
// own route under app/(playground)/{section path}/{slug}/page.tsx.

import { SITE_NAME } from "@/lib/site";
import { isoDate, pageMetadata } from "@/lib/social";

export { SITE_NAME };

export type SectionId = "react-practices" | "browser-platform" | "performance-accessibility" | "security" | "system-design" | "under-the-hood" | "testing" | "seo";

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
export const UNDER_THE_HOOD_PATH = "/under-the-hood";
export const TESTING_PATH = "/testing";
export const SEO_PATH = "/seo";

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
    summary: "How to run a frontend design: scope the requirements, shape an architecture and data model, choose the trade-offs, then apply it to a news feed, an autocomplete, a frontend monorepo and micro frontends.",
    href: SYSTEM_DESIGN_PATH,
  },
  {
    id: "under-the-hood",
    title: "Under the Hood",
    summary: "What runs between your source and the screen: the build pipeline, transpilers, bundlers, the CSS toolchain, and how React turns JSX into DOM updates.",
    href: UNDER_THE_HOOD_PATH,
  },
  {
    id: "testing",
    title: "Testing",
    summary: "How to know the app still works: choosing what to test at which level, end-to-end tests with Playwright and page objects, behaviour-driven scenarios with Cucumber, and A/B experiments.",
    href: TESTING_PATH,
  },
  {
    id: "seo",
    title: "SEO",
    summary: "How search engines and AI assistants find, read and rank a site, from the crawl pipeline to robots.txt, sitemaps, metadata, llms.txt and SEO at scale, set up for real on this site.",
    href: SEO_PATH,
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
  /** ISO date the page was first published. */
  created: string;
  /** ISO date of the page's latest content change. */
  updated: string;
};

export const practices = [
  {
    slug: "toast-notifications",
    number: 1,
    title: "Toast / Notification System",
    summary: "Queued, auto-dismissing notifications with pause on hover and stacking.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "searchable-accordion",
    number: 2,
    title: "Searchable Accordion",
    summary: "Expandable sections filtered by a search query, with match highlighting.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-08",
  },
  {
    slug: "infinite-scroll",
    number: 3,
    title: "Infinite Scroll",
    summary: "Load the next page as the user nears the end of the list.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "data-fetching-hook",
    number: 4,
    title: "Custom Data-Fetching Hook with Caching",
    summary: "A reusable fetch hook with caching, deduplication, and stale data handling.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "realtime-chat",
    number: 5,
    title: "Real-Time Chat UI",
    summary: "Live message stream with optimistic sends and auto-scroll.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "file-upload",
    number: 6,
    title: "File Upload with Progress",
    summary: "Drag-and-drop uploads with per-file progress, cancel, and retry.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "virtualized-list",
    number: 7,
    title: "Virtualized Large Lists",
    summary: "Render only the visible rows of a very large list.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "accessible-modal",
    number: 8,
    title: "Accessible Modal",
    summary: "A dialog with focus trap, Escape to close, and focus restore.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-08",
  },
  {
    slug: "context-reducer",
    number: 9,
    title: "Context + useReducer State Management",
    summary: "App state with a reducer, typed actions, and context without extra re-renders.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "multi-step-form",
    number: 10,
    title: "Multi-Step Form",
    summary: "A wizard with per-step validation, back navigation, and a review step.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "lazy-images",
    number: 11,
    title: "Lazy-Loaded Images",
    summary: "Load images only when they approach the viewport, with placeholders.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "debounced-search",
    number: 12,
    title: "Debounced Search + API Cache",
    summary: "Search-as-you-type that debounces input, caches results, and drops stale responses.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    slug: "data-grid",
    number: 13,
    title: "Advanced Data Grid",
    summary: "Sorting, filtering, pagination, column resizing, and row selection.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-08",
  },
  {
    slug: "large-dataset-performance",
    number: 14,
    title: "Large Dataset Performance Optimization",
    summary: "Measure and fix slow renders on big datasets, naive vs optimized.",
    built: true,
    created: "2026-10-08",
    updated: "2026-10-13",
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
  return pageMetadata({
    path: practiceHref(slug),
    title: practice.title,
    description: practice.summary,
    card: `/og/practice/${slug}`,
    article: { published: isoDate(practice.created), modified: isoDate(practice.updated) },
  });
}

// Topic pages of the sections other than React Practices. Slugs are unique
// across sections; `written` turns true once a page's content ships.

export type TopicSectionId = Exclude<SectionId, "react-practices">;

/** How advanced a page is, shown on its section card when set. */
export type PageLevel = "Basics" | "Basics to intermediate" | "Intermediate" | "Intermediate to senior" | "Senior to expert";

export type TopicPageMeta = {
  section: TopicSectionId;
  slug: string;
  title: string;
  summary: string;
  level?: PageLevel;
} & (
  | {
      written: true;
      /** ISO date the page was first published. */
      created: string;
      /** ISO date of the page's latest content change. */
      updated: string;
    }
  | { written: false }
);

export const topicPages = [
  {
    section: "browser-platform",
    slug: "networking",
    title: "Networking",
    summary: "How a request reaches the server and back: DNS, TCP, TLS, HTTP messages and caching, HTTP/1.1 to HTTP/3, and what HTTPS protects, each with a live demo.",
    written: true,
    created: "2026-10-09",
    updated: "2026-10-13",
  },
  {
    section: "browser-platform",
    slug: "origins-and-cors",
    title: "Origins, DNS and CORS",
    summary: "The parts of a URL, how DNS finds a host, what an origin and a site are, and how CORS lets a server share responses across origins, each with a live demo.",
    written: true,
    created: "2026-10-09",
    updated: "2026-10-13",
  },
  {
    section: "browser-platform",
    slug: "rendering",
    title: "How the browser renders a page",
    summary: "Parsing into the DOM and CSSOM, what blocks parsing and rendering, layout, paint and composite, and layout thrashing, each with a live demo.",
    written: true,
    created: "2026-10-09",
    updated: "2026-10-13",
  },
  {
    section: "performance-accessibility",
    slug: "performance",
    title: "Performance",
    summary: "Core Web Vitals, HTML delivery and CDNs, the critical path, images, fonts, code splitting and web workers, each with a live demo.",
    written: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    section: "performance-accessibility",
    slug: "accessibility",
    title: "Accessibility",
    summary: "Semantic HTML and ARIA, structure, keyboard focus, dynamic content, images and media, contrast, type, motion, forms and inclusive design, each with a live demo.",
    written: true,
    created: "2026-10-08",
    updated: "2026-10-13",
  },
  {
    section: "security",
    slug: "jwt",
    title: "JSON Web Tokens",
    summary: "What a JWT proves and who can read it, the verifier mistakes behind real attacks, expiry, refresh and revocation, where to keep tokens in the browser, and key rotation, each with a live demo.",
    written: true,
    created: "2026-10-12",
    updated: "2026-10-13",
  },
  {
    section: "security",
    slug: "xss-csp-csrf",
    title: "XSS, CSP and CSRF",
    summary: "How untrusted content becomes running script and how encoding stops it, what a Content-Security-Policy does as a second wall, and how another site makes a request as the logged-in user, each with a live demo.",
    written: true,
    created: "2026-10-12",
    updated: "2026-10-13",
  },
  {
    section: "system-design",
    slug: "method",
    title: "The design method",
    summary: "A repeatable way to run any frontend design prompt: clarify requirements, shape the architecture and data model, define the interface, go deep on the hard parts, and defend the trade-offs, with interactive references.",
    written: true,
    created: "2026-10-12",
    updated: "2026-10-20",
  },
  {
    section: "system-design",
    slug: "news-feed",
    title: "Design a news feed",
    summary: "The method applied end to end to an infinite, personalised feed: requirements and architecture, the data model and why feeds need cursor pagination, and deep dives on virtualization, media, optimistic likes and freshness.",
    written: true,
    created: "2026-10-12",
    updated: "2026-10-20",
  },
  {
    section: "system-design",
    slug: "autocomplete",
    title: "Design an autocomplete",
    summary: "The method applied to a typeahead: requirements and architecture, the request lifecycle (debounce, cancel, and why the latest query must win), and the accessible combobox keyboard pattern, with live demos.",
    written: true,
    created: "2026-10-12",
    updated: "2026-10-20",
  },
  {
    section: "system-design",
    slug: "monorepo",
    title: "Design a frontend monorepo",
    summary: "The method applied to the codebase itself: several apps sharing UI and config, the tools compared, and deep dives on affected builds and task caching, module boundaries, dependency and release policy, and CI time as the repo grows, with live demos.",
    written: true,
    created: "2026-10-20",
    updated: "2026-10-20",
  },
  {
    section: "system-design",
    slug: "micro-frontends",
    title: "Design micro frontends",
    summary: "The method applied to a store built by four teams that release separately: when micro frontends are worth it, how the page is composed, shared dependencies, routing and event contracts, releases and failure isolation, and style isolation, with live demos.",
    written: true,
    created: "2026-10-20",
    updated: "2026-10-20",
  },
  {
    section: "under-the-hood",
    slug: "build-pipeline",
    title: "From source to bundle",
    summary: "What one build command runs: which tool does each job in Create React App, Vite and Next.js, the resolve, transform, bundle, optimize and emit stages, dev vs production builds, and content hashes, each with a live demo.",
    written: true,
    created: "2026-10-13",
    updated: "2026-10-13",
  },
  {
    section: "under-the-hood",
    slug: "transpiling",
    title: "Transpiling: TypeScript and JSX to JavaScript",
    summary: "Tokens, the syntax tree, transforms and code generation; stripping types vs checking them; the JSX runtimes; syntax lowering for older browsers; and source maps, each with a live demo.",
    written: true,
    created: "2026-10-13",
    updated: "2026-10-13",
  },
  {
    section: "under-the-hood",
    slug: "bundlers",
    title: "Bundlers: graph, runtime, chunks and dev servers",
    summary: "How a bundler resolves imports into a module graph, the runtime that links modules, tree shaking and side effects, code splitting, and why webpack, Vite and Turbopack run dev differently, each with a live demo.",
    written: true,
    created: "2026-10-13",
    updated: "2026-10-13",
  },
  {
    section: "under-the-hood",
    slug: "css-pipeline",
    title: "The CSS pipeline",
    summary: "How CSS gets into the bundle, what Sass compiles to, PostCSS plugins, how CSS Modules scope class names, and how Tailwind generates only the utilities you use, each with a live demo.",
    written: true,
    created: "2026-10-13",
    updated: "2026-10-13",
  },
  {
    section: "under-the-hood",
    slug: "react-internals",
    title: "Inside React: from JSX to DOM updates",
    summary: "What JSX becomes, the element and fiber trees, how reconciliation diffs them and why keys matter, the render and commit phases, and urgent vs deferred updates, each with a live demo.",
    written: true,
    created: "2026-10-13",
    updated: "2026-10-13",
  },
  {
    section: "testing",
    slug: "strategy",
    title: "Testing strategy",
    summary: "What a test buys, the levels from static checks to end to end, pyramid and trophy, choosing the level for a case, test doubles, and where each check runs, each with a live demo.",
    written: true,
    created: "2026-10-21",
    updated: "2026-10-21",
  },
  {
    section: "testing",
    slug: "e2e-playwright",
    title: "End-to-end testing with Playwright",
    summary: "A real end-to-end suite for this site: locators that survive redesigns, auto-waiting instead of sleeps, page objects and fixtures, and reading a failure from CI.",
    written: true,
    created: "2026-10-21",
    updated: "2026-10-21",
  },
  {
    section: "testing",
    slug: "bdd-cucumber",
    title: "Behaviour-driven tests with Cucumber",
    summary: "Gherkin scenarios that product owners can read and the suite can run: feature files, step definitions on top of page objects, and living documentation.",
    written: true,
    created: "2026-10-21",
    updated: "2026-10-21",
  },
  {
    section: "testing",
    slug: "ab-testing",
    title: "A/B testing",
    summary: "A real experiment on this site: sticky assignment without flicker, then sample size, significance, the cost of peeking, and the checks that catch a broken split.",
    written: true,
    created: "2026-10-21",
    updated: "2026-10-21",
  },
  {
    section: "seo",
    slug: "how-search-works",
    title: "How search works",
    summary: "What happens between a URL and a search result: the crawl, render, index and serve pipeline, how pages are found, what a crawler reads, duplicate URLs, and what ranking and Search Console numbers mean.",
    level: "Basics",
    written: true,
    created: "2026-10-22",
    updated: "2026-10-22",
  },
  {
    section: "seo",
    slug: "crawling-indexing",
    title: "Crawling and indexing control",
    summary: "This site's own robots.txt, sitemap and canonical URLs, plus meta robots, X-Robots-Tag, status codes, redirects and crawl budget.",
    level: "Basics to intermediate",
    written: true,
    created: "2026-10-22",
    updated: "2026-10-22",
  },
  {
    section: "seo",
    slug: "javascript-seo",
    title: "JavaScript and rendering SEO",
    summary: "What client rendering costs in search, server and static rendering, soft 404s, crawlable links, and metadata that is in the HTML before any script runs.",
    level: "Intermediate",
    written: true,
    created: "2026-10-22",
    updated: "2026-10-22",
  },
  {
    section: "seo",
    slug: "metadata-structured-data",
    title: "Metadata and structured data",
    summary: "Titles and descriptions that earn the click, social cards and their images, and JSON-LD for rich results, added to this site and checked.",
    level: "Intermediate",
    written: true,
    created: "2026-10-22",
    updated: "2026-10-22",
  },
  {
    section: "seo",
    slug: "ai-search",
    title: "SEO for AI search and LLMs",
    summary: "How AI assistants and answer engines crawl and cite pages, rules for AI crawlers in robots.txt, and this site's llms.txt.",
    level: "Intermediate to senior",
    written: true,
    created: "2026-10-22",
    updated: "2026-10-22",
  },
  {
    section: "seo",
    slug: "seo-at-scale",
    title: "SEO at scale",
    summary: "International sites and hreflang, migrations without lost traffic, faceted navigation, programmatic pages, log analysis, and SEO checks in the end-to-end suite.",
    level: "Senior to expert",
    written: false,
  },
] as const satisfies readonly TopicPageMeta[];

export type TopicPage = (typeof topicPages)[number];
export type TopicSlug = TopicPage["slug"];

const SECTION_PATH: Record<TopicSectionId, string> = {
  "browser-platform": BROWSER_PATH,
  "performance-accessibility": PERF_A11Y_PATH,
  security: SECURITY_PATH,
  "system-design": SYSTEM_DESIGN_PATH,
  "under-the-hood": UNDER_THE_HOOD_PATH,
  testing: TESTING_PATH,
  seo: SEO_PATH,
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

/** A section's page by its slug, for routes that take the slug from the address. */
export function findTopicPage(section: TopicSectionId, slug: string): TopicPage | undefined {
  return topicPages.find((p) => p.section === section && p.slug === slug);
}

export function topicHref(slug: TopicSlug) {
  const page = getTopicPage(slug);
  return `${SECTION_PATH[page.section]}/${slug}`;
}

export function topicMetadata(slug: TopicSlug) {
  const page = getTopicPage(slug);
  return pageMetadata({
    path: topicHref(slug),
    title: page.title,
    description: page.summary,
    card: `/og/topic/${slug}`,
    article: page.written ? { published: isoDate(page.created), modified: isoDate(page.updated) } : undefined,
  });
}

/** How much of a section has content, for its home card. Null for coming-soon sections. */
export function sectionProgress(id: SectionId): { done: number; total: number; noun: string } | null {
  if (id === "react-practices") return { done: builtCount, total: practices.length, noun: "practices built" };
  const pages = sectionPages(id);
  return { done: pages.filter((p) => p.written).length, total: pages.length, noun: pages.length === 1 ? "page written" : "pages written" };
}
