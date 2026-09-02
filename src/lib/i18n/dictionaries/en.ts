/**
 * English dictionary — the CANONICAL shape. `Dictionary = typeof en`, so every
 * other locale (see vi.ts) is type-checked against this tree. Holds UI/prose
 * strings only; structured content data (experience, projects, gallery, skills,
 * profile) is localized separately via LocalizedString in src/content.
 */

/** One About-bio chapter (kicker/heading only on the first). */
export interface Chapter {
  kicker?: string;
  heading?: string;
  body: string;
}

export const en = {
  skip: {
    toContent: "Skip to content",
  },
  nav: {
    links: { work: "Work", about: "About", contact: "Contact" },
    sections: {
      home: "Home",
      about: "About",
      ethos: "Ethos",
      gallery: "Gallery",
      capabilities: "Capabilities",
      career: "Career",
      work: "Work",
      contact: "Contact",
    },
    logoHome: "home",
  },
  hero: {
    // The oversized "SOFTWARE / ENGINEER" wordmark stays English (a stylized
    // letter-cascade art piece); only this corner runner is localized.
    runnerSince: "Engineering since",
  },
  about: {
    chip: "About",
    person: "The Person",
    chapters: [
      {
        kicker: "The Person",
        heading: "The Person",
        body: "I'm Huy — born and raised in Vietnam, now building software in Ho Chi Minh City and running mostly on coffee.",
      },
      {
        body: "For the past four years I've shipped web platforms across healthcare, legal-tech, and enterprise-event work — most recently leading frontend for AI-native healthcare products at Naver, where there are fewer bugs but far higher stakes.",
      },
      {
        body: "I care, maybe a little too much, about the craft: scalable architecture, design systems teams actually adopt, and interfaces polished down to the motion. This whole site is me quietly showing off.",
      },
      {
        body: "Off the clock, you'll find me deep in anime, hunting for a good playlist, or losing an argument with Bông — my tuxedo cat and unpaid code reviewer, who, if you look closely, may have wandered onto this page too. 🐱",
      },
    ] as Chapter[],
    // Words rendered in the lime accent — must be single, space-separated tokens
    // that appear verbatim in the chapter text above (matched per word).
    accentWords: [
      "Huy",
      "Bông",
      "Person",
      "software",
      "Naver",
      "architecture",
      "interfaces",
      "anime",
      "coffee",
    ],
  },
  statement: {
    text: "“ I build web platforms that stay fast, accessible, and considered — from the first product spec to the last production alert, with AI brought in only where it earns its place. The rest is caffeine and stubbornness. ”",
    // Must remain an exact substring of `text` above (drives the accent sweep).
    accentPhrase: "fast, accessible, and considered, AI",
  },
  gallery: {
    eyebrow: "Gallery",
    heading: "Off the clock",
    body: "A few frames from life away from the keyboard — gym, coffee, and a cat who runs the place.",
    drag: "Drag to explore",
  },
  whatIDo: {
    eyebrow: "What I Do",
    heading: "Capabilities",
    // Short labels on the decorative ring — kept as tech-domain shorthand.
    ring: ["FRONTEND", "AI", "BACKEND", "QUALITY"],
  },
  experience: {
    eyebrow: "Career",
    heading: "Career &",
    headingAccent: "Experience",
    subhead:
      "Over four years shipping production frontend across clinical, legal, and enterprise domains.",
    now: "NOW",
  },
  work: {
    eyebrow: "Selected Work",
    heading: "Projects",
    liveDemo: "Live demo",
    source: "Source",
  },
  contact: {
    availability: "Open to opportunities",
    eyebrow: "Get in touch",
    heading: "Let's talk",
    body: "Have a role, a project, or just want to talk shop? My inbox is open — and I actually reply.",
    findElsewhere: "Find me elsewhere",
  },
  email: {
    copy: "Copy",
    copied: "Copied",
    copyAria: "Copy email address",
    copiedAria: "Email address copied",
  },
  footer: {
    personality:
      "Shipping fast, accessible web things since 2021 — fueled by coffee, supervised by one very judgmental cat.",
    colophon: "Designed, built & slightly over-thought",
    backToTop: "Back to top",
    backToTopSuffix: "back to top",
  },
};

export type Dictionary = typeof en;
