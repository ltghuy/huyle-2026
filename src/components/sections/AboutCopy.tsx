/**
 * Shared "The Person" copy — the single source of truth rendered in two places:
 *  - the no-JS / reduced-motion fallback inside `#about` (About.tsx), and
 *  - the animated scroll-hijack chapters in the fixed layer (ScrollPortrait).
 * Keeping it here means the two can never drift.
 *
 * The bio is split into CHAPTERS: each is revealed on its own, word-by-word, as a
 * pinned scroll-hijack beat (see ScrollPortrait). Plain JSX, no hooks — safe to
 * import into both a server and a client component.
 */

export const NAME_LEFT = "HUY";
export const NAME_RIGHT = "LE";

/** Words rendered in the solid lime accent — the rest stay solid near-white,
 *  matching the Statement section's colour style (solid fg + lime highlights).
 *  Names plus one or two key nouns per chapter; kept next to the copy so edits
 *  stay in sync. */
const ACCENT_WORDS = new Set([
  "Huy",
  "Bông",
  "Person",
  "software",
  "Naver",
  "architecture",
  "interfaces",
  "anime",
  "coffee",
]);

export interface Chapter {
  /** small mono kicker above the heading (first chapter only) */
  kicker?: string;
  /** display heading (first chapter only) */
  heading?: string;
  /** the paragraph body */
  body: string;
}

export const ABOUT_CHAPTERS: Chapter[] = [
  {
    kicker: "The Person",
    heading: "The Person",
    body: "I'm Huy — born and raised in Vietnam, now building software in Ho Chi Minh City, powered mostly by coffee.",
  },
  {
    body: "Over the last 4+ years I've shipped production web platforms across healthcare, legal-tech, and enterprise-event domains — most recently leading frontend on AI-native healthcare products at Naver, where the bugs are fewer but the stakes are much higher.",
  },
  {
    body: "I care, maybe a little too much, about the craft: scalable architecture, design systems teams actually adopt, and interfaces considered right down to the motion. This whole site is me quietly showing off.",
  },
  {
    body: "Off the clock you'll find me deep in anime, chasing a good playlist, or losing an argument with Bông — my tuxedo cat and unpaid code reviewer, who, if you look closely, may have wandered into this page too. 🐱",
  },
];

/** Strip trailing punctuation so accent matching works on the bare word. */
function bareWord(word: string) {
  return word.replace(/[—.,:;]/g, "");
}

/**
 * Renders text as individual `[data-word]` spans (inline-block, so each can be
 * transformed independently for the word-by-word reveal). Accent words keep the
 * lime colour. Spacing comes from a right margin, not whitespace, so inline-block
 * words don't collapse their gaps.
 */
export function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          data-word
          className={`inline-block will-change-transform ${
            ACCENT_WORDS.has(bareWord(word)) ? "text-accent-outline" : ""
          }`}
          style={{ marginRight: "0.28em" }}
        >
          {word}
        </span>
      ))}
    </>
  );
}

/** One chapter block — the kicker/heading (chapter 1) plus the body paragraph. */
export function ChapterBlock({
  chapter,
  bodyClassName,
}: {
  chapter: Chapter;
  bodyClassName?: string;
}) {
  return (
    <>
      {chapter.kicker && <p className="eyebrow mb-3">{chapter.kicker}</p>}
      {chapter.heading && (
        <p aria-hidden className="display mb-6 text-5xl text-fg sm:text-7xl">
          <Words text={chapter.heading} />
        </p>
      )}
      <p className={bodyClassName}>
        <Words text={chapter.body} />
      </p>
    </>
  );
}

/** Static fallback (no-JS / reduced motion): every chapter stacked and readable. */
export function AboutBio({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="eyebrow">The Person</p>
      <h2 className="display text-4xl text-fg sm:text-6xl">The Person</h2>
      <p className="text-xl leading-relaxed text-fg">
        {ABOUT_CHAPTERS[0].body}
      </p>
      <div className="space-y-4 text-base leading-relaxed text-fg-muted sm:text-lg">
        {ABOUT_CHAPTERS.slice(1).map((c, i) => (
          <p key={i}>{c.body}</p>
        ))}
      </div>
    </div>
  );
}
