// The data behind the design-method page: the framework stages, four sample
// products the method is worked against, and the recurring trade-off decisions.
// Client-safe and reusable by the case-study pages to come. Everything here is
// one worked example, not the only correct answer.

export type Stage = {
  id: string;
  name: string;
  minutes: string;
  summary: string;
  produce: string[];
  mistakes: string[];
};

export const STAGES: Stage[] = [
  {
    id: "requirements",
    name: "Clarify requirements",
    minutes: "~15%",
    summary: "Turn a vague prompt into a scoped problem before designing anything.",
    produce: ["The core user flows that must work (functional)", "The non-functional bar: performance, accessibility, offline, i18n, security, device/network", "An explicit list of what's out of scope, and the assumptions behind it"],
    mistakes: ["Designing before scoping", "Treating it as backend scale rather than the client experience", "Never writing down what you're not building"],
  },
  {
    id: "architecture",
    name: "High-level architecture",
    minutes: "~20%",
    summary: "Sketch the components and their boundaries, and pick a rendering strategy.",
    produce: ["A component diagram: views, the data layer, shared services", "Where each piece runs: server, client, edge", "The rendering choice (CSR / SSR / SSG / streaming) and why"],
    mistakes: ["Jumping to component names before responsibilities", "Ignoring where rendering happens", "One giant component with no boundaries"],
  },
  {
    id: "data-model",
    name: "Data model",
    minutes: "~15%",
    summary: "Define the entities and where state lives.",
    produce: ["The entities and their relationships", "Server state vs client/UI state vs URL state", "Whether the client cache is normalised, and how it's keyed"],
    mistakes: ["Putting server data in component state", "No plan for cache invalidation", "Duplicating the same entity in several shapes"],
  },
  {
    id: "interface",
    name: "Interface and data flow",
    minutes: "~20%",
    summary: "Specify the API the client talks to and how data moves through the app.",
    produce: ["Endpoints or operations, their shapes, and pagination", "The read and write paths, including optimistic updates", "Realtime transport if any (poll / SSE / WebSocket)"],
    mistakes: ["Chatty or waterfall request patterns", "No error or loading contract", "Over-fetching whole objects for a list"],
  },
  {
    id: "deep-dives",
    name: "Deep dives and optimisations",
    minutes: "~20%",
    summary: "Go deep on the one or two parts that make this problem hard.",
    produce: ["Performance: critical path, bundle budget, list virtualization, images", "Accessibility: focus, keyboard, announcements", "Resilience: retries, offline, race conditions"],
    mistakes: ["Spreading thin instead of going deep where it matters", "Optimising what isn't the bottleneck", "Leaving accessibility to the end"],
  },
  {
    id: "tradeoffs",
    name: "Trade-offs and wrap-up",
    minutes: "~10%",
    summary: "State the assumptions, name the alternatives, and say what you'd revisit.",
    produce: ["The main decisions with their trade-offs", "What you'd do differently at 10× the scale", "What you deliberately deferred"],
    mistakes: ["Claiming one 'best' answer", "Not revisiting earlier assumptions", "No story for growth or failure"],
  },
];

export type NonFunctional = { axis: string; note: string };
export type Product = {
  id: string;
  name: string;
  brief: string;
  /** How each stage lands for this product, keyed by Stage.id. */
  stageNotes: Record<string, string>;
  functional: string[];
  nonFunctional: NonFunctional[];
  questions: string[];
};

export const PRODUCTS: Product[] = [
  {
    id: "feed",
    name: "News feed",
    brief: "An infinite, personalised feed of posts with media and interactions.",
    stageNotes: {
      requirements: "Scroll, post, like/comment, media. Ask: how personalised, how fresh, which devices, read-heavy vs write-heavy?",
      architecture: "Feed list + composer + post card + a shared feed store. SSR the first screen for load and SEO, hydrate, then client-fetch more.",
      "data-model": "A normalised post store keyed by id so a like updates one place; the feed is an ordered list of ids with a cursor.",
      interface: "Cursor pagination (not offset, because the feed shifts). Optimistic likes. Media lazy-loaded. Prefetch the next page near the end.",
      "deep-dives": "Virtualize the list, reserve image space to avoid layout shift, and keep interactions off the main thread during scroll.",
      tradeoffs: "Cursor vs offset, client vs server ranking, how much to prefetch. At scale: windowed rendering and a CDN for media.",
    },
    functional: ["Scroll an endless feed", "Create a post with text and media", "Like and comment, with the count updating", "Pull to refresh / load newer"],
    nonFunctional: [
      { axis: "Performance", note: "Fast first screen; smooth 60fps scroll over thousands of items." },
      { axis: "Accessibility", note: "Keyboard and screen-reader support; new items announced politely." },
      { axis: "Network", note: "Works on flaky mobile; images degrade gracefully." },
      { axis: "Freshness", note: "How stale may the feed be: seconds, or minutes?" },
    ],
    questions: ["How is the feed ranked, and on the client or the server?", "How fresh must it be?", "Which media types, and what sizes?", "Mobile-first or desktop too?"],
  },
  {
    id: "autocomplete",
    name: "Autocomplete",
    brief: "A typeahead that suggests results as the user types.",
    stageNotes: {
      requirements: "Suggest as you type, from a large corpus. Ask: how many results, how fast, fuzzy matching, keyboard-only use?",
      architecture: "An input + a results list + a small query engine with a cache; the suggestion source is a debounced remote call.",
      "data-model": "A cache keyed by the normalised query string; results are lightweight (label + id), not full records.",
      interface: "Debounce input, cancel stale requests, and drop out-of-order responses so the newest query always wins.",
      "deep-dives": "Keyboard a11y (roving focus, aria-activedescendant), request de-duplication, and ranking/highlighting matches.",
      tradeoffs: "Debounce delay vs responsiveness, client cache vs always-fresh, prefix vs fuzzy matching. At scale: an edge search index.",
    },
    functional: ["Show suggestions while typing", "Choose a suggestion by mouse or keyboard", "Highlight the matched text", "Handle no-results and errors"],
    nonFunctional: [
      { axis: "Performance", note: "Suggestions within ~100ms of a pause; no jank per keystroke." },
      { axis: "Accessibility", note: "Full combobox pattern: arrow keys, Enter, Escape, announcements." },
      { axis: "Correctness", note: "The latest keystroke's results win, never a stale response." },
      { axis: "Network", note: "Minimise requests: debounce, cache, dedupe." },
    ],
    questions: ["How large is the corpus, and where does it live?", "Prefix or fuzzy matching?", "How many suggestions, and any grouping?", "Keyboard-only users a priority?"],
  },
  {
    id: "chat",
    name: "Chat application",
    brief: "A real-time messaging UI with delivery and read state.",
    stageNotes: {
      requirements: "Send/receive in real time, history, delivery/read receipts. Ask: 1:1 or group, scale of a room, offline send?",
      architecture: "Message list + composer + a connection manager; a store per conversation. Render shell on the server, stream messages on the client.",
      "data-model": "Messages keyed by id with a client-assigned temp id for optimistic sends; conversations hold an ordered id list and a seq cursor.",
      interface: "WebSocket (or SSE + POST) for the stream; a serial outbox so optimistic sends keep order; reconnect with backoff.",
      "deep-dives": "Scroll management (stick to bottom, jump-to-latest), ordering under races, and offline queueing.",
      tradeoffs: "WebSocket vs SSE vs polling, optimistic vs confirmed order, how much history to keep in memory. At scale: pagination and windowing.",
    },
    functional: ["Send and receive messages live", "See delivery and read state", "Load older history on scroll", "Show typing and presence"],
    nonFunctional: [
      { axis: "Realtime", note: "Low latency; messages arrive and order correctly." },
      { axis: "Resilience", note: "Survive reconnects; queue sends while offline." },
      { axis: "Accessibility", note: "New messages announced; focus stays usable." },
      { axis: "Performance", note: "A long conversation stays smooth to scroll." },
    ],
    questions: ["1:1 or group, and how large?", "Must it work offline?", "How much history, and is it editable/deletable?", "Delivery/read receipts required?"],
  },
  {
    id: "design-system",
    name: "Design system",
    brief: "A shared component library and tokens used across many apps.",
    stageNotes: {
      requirements: "Reusable, themeable, accessible components for many teams. Ask: which platforms, how many consumers, versioning needs?",
      architecture: "Primitives + composed components + tokens; documentation; a build that ships tree-shakeable, typed packages.",
      "data-model": "Design tokens (colour, space, type) as the single source; component APIs (props, variants) as contracts.",
      interface: "Stable, minimal component APIs; variant systems; a theming contract via CSS variables rather than hard-coded values.",
      "deep-dives": "Accessibility contracts per component, theming/dark mode, and how changes roll out without breaking consumers.",
      tradeoffs: "Flexibility vs consistency, compound vs monolithic APIs, how strictly to version. At scale: codemods and deprecation policy.",
    },
    functional: ["A set of accessible, themeable components", "Design tokens consumers can theme", "Documentation and usage examples", "Versioned, tree-shakeable distribution"],
    nonFunctional: [
      { axis: "Accessibility", note: "Each component meets WCAG by default; keyboard and ARIA built in." },
      { axis: "Consistency", note: "One source of truth for tokens; no divergent one-offs." },
      { axis: "Compatibility", note: "Changes don't silently break consumers; clear versioning." },
      { axis: "Bundle", note: "Tree-shakeable; a consumer pays only for what it imports." },
    ],
    questions: ["Which frameworks and platforms must it support?", "How many teams consume it?", "How are breaking changes rolled out?", "Theming and dark mode required?"],
  },
];

export type DecisionOption = { name: string; what: string; wins: string; costs: string };
export type Decision = {
  id: string;
  name: string;
  servesAxes: string[];
  intro: string;
  options: DecisionOption[];
};

export const DECISIONS: Decision[] = [
  {
    id: "rendering",
    name: "Rendering strategy",
    servesAxes: ["Performance", "SEO", "Freshness"],
    intro: "Where and when the HTML is produced shapes load, SEO and interactivity.",
    options: [
      { name: "CSR", what: "Ship a shell; the client renders everything.", wins: "Simple hosting; app-like after load.", costs: "Slow first paint; weak SEO; needs JS." },
      { name: "SSR", what: "Render HTML per request on the server.", wins: "Fast first paint; fresh; SEO-friendly.", costs: "Server cost; hydration; TTFB tied to data." },
      { name: "SSG", what: "Render HTML at build time.", wins: "Fastest, cacheable, cheap.", costs: "Stale until rebuilt; not for per-user data." },
      { name: "Streaming / RSC", what: "Stream server-rendered chunks, hydrate islands.", wins: "Fast perceived load; less client JS.", costs: "More complex; newer model." },
    ],
  },
  {
    id: "data-fetching",
    name: "Data fetching and caching",
    servesAxes: ["Performance", "Correctness", "Network"],
    intro: "How the client gets data and keeps it consistent.",
    options: [
      { name: "Fetch-on-render", what: "Each component fetches what it needs.", wins: "Simple, colocated.", costs: "Waterfalls; duplicate requests." },
      { name: "Fetch-then-render", what: "Load data, then render.", wins: "No spinners mid-tree.", costs: "Slower to first content." },
      { name: "Cache + SWR", what: "Serve cache, revalidate in background.", wins: "Instant repeat views; dedup.", costs: "Stale flashes; cache invalidation." },
      { name: "Normalised store", what: "One entity cache keyed by id.", wins: "One update, consistent everywhere.", costs: "More setup; mapping overhead." },
    ],
  },
  {
    id: "pagination",
    name: "Pagination",
    servesAxes: ["Performance", "Correctness"],
    intro: "How a long list is loaded in parts.",
    options: [
      { name: "Offset / page", what: "LIMIT/OFFSET or page numbers.", wins: "Jump to any page; simple.", costs: "Drifts when items are inserted; slow deep offsets." },
      { name: "Cursor", what: "A pointer to the last item seen.", wins: "Stable under inserts; efficient.", costs: "No random page access." },
      { name: "Infinite scroll", what: "Load the next page near the end.", wins: "Continuous scrolling for feeds.", costs: "No footer; needs virtualization; harder to deep-link." },
    ],
  },
  {
    id: "state",
    name: "State location",
    servesAxes: ["Correctness", "Performance"],
    intro: "Different kinds of state belong in different places.",
    options: [
      { name: "Local component", what: "useState in the component.", wins: "Simple; isolated re-renders.", costs: "Can't share; lost on unmount." },
      { name: "URL", what: "Query params / route.", wins: "Shareable, refresh-safe, back/forward.", costs: "Strings only; needs sync." },
      { name: "Shared client store", what: "Context/reducer or a store.", wins: "Shared UI state; controlled re-renders.", costs: "Boilerplate; easy to overuse." },
      { name: "Server state", what: "Cached remote data (query layer).", wins: "Caching, dedup, revalidation built in.", costs: "A dependency; not for pure UI state." },
    ],
  },
  {
    id: "realtime",
    name: "Realtime transport",
    servesAxes: ["Realtime", "Network", "Resilience"],
    intro: "How the client gets live updates.",
    options: [
      { name: "Polling", what: "Ask on an interval.", wins: "Trivial; works everywhere.", costs: "Latency vs load trade-off; wasteful." },
      { name: "SSE", what: "Server pushes over one HTTP stream.", wins: "Simple server→client; auto-reconnect.", costs: "One-way; connection limits on HTTP/1.1." },
      { name: "WebSocket", what: "Full-duplex connection.", wins: "Low latency both ways.", costs: "More infra; reconnection/backpressure to handle." },
    ],
  },
];
