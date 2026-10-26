/**
 * English dictionary — the CANONICAL shape. `Dictionary = typeof en`, so every
 * other locale (see vi.ts) is type-checked against this tree. Holds UI/prose
 * strings only; structured content data (experience, projects, gallery, skills,
 * profile) is localized separately via the src/content/vi.ts overlay.
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
        body: "I'm Huy. I was born and raised in Vietnam, and now I build software in Ho Chi Minh City, mostly on coffee.",
      },
      {
        body: "For the past four years I've shipped web platforms for healthcare, legal-tech, and enterprise events. Most recently I've led frontend for AI-native healthcare products at Naver, where bugs are rarer and the stakes are much higher.",
      },
      {
        body: "I care, maybe a little too much, about the craft: architecture that scales, design systems other teams want to use, and interfaces polished down to the motion. This site is me showing off a bit.",
      },
      {
        body: "Off the clock I'm usually watching anime, hunting for a good playlist, or losing an argument with Bông, my tuxedo cat and unpaid code reviewer. Look closely and you might spot Bông somewhere on this page too. 🐱",
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
    text: "“ I build web platforms that stay fast and accessible from the first product spec to the last production alert, and I add AI only where it helps the people using them. Coffee and stubbornness cover the rest. ”",
    // Must remain an exact substring of `text` above (drives the accent sweep).
    accentPhrase: "fast and accessible",
  },
  gallery: {
    eyebrow: "Gallery",
    heading: "Off the clock",
    body: "A few frames from life away from the keyboard: the gym, coffee, and a cat who runs the place.",
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
      "More than four years of production frontend work on clinical, legal, and enterprise products.",
    now: "NOW",
  },
  work: {
    eyebrow: "Selected Work",
    heading: "Projects",
    liveDemo: "Visit site",
    comingSoon: "Coming soon",
    placeholderBody: "Another project is on the way.",
    source: "Source",
  },
  contact: {
    availability: "Open to opportunities",
    eyebrow: "Get in touch",
    heading: "Let's talk",
    body: "Have a role, a project, or just want to talk shop? Email me. I do reply.",
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
      "Building fast, accessible websites since 2021, fueled by coffee and supervised by one very judgmental cat.",
    colophon: "Designed, built & slightly over-thought",
    backToTop: "Back to top",
    backToTopSuffix: "back to top",
  },
};

export type Dictionary = typeof en;
