/**
 * Shared "The Person" copy renderers — used in two places:
 *  - the no-JS / reduced-motion fallback inside `#about` (About.tsx), and
 *  - the animated scroll-hijack chapters in the fixed layer (ScrollPortrait).
 *
 * The bio chapters + accent words now come from the active-locale dictionary
 * (see src/lib/i18n) and are passed in as props, so this file holds no copy —
 * only the rendering. Plain JSX, no hooks: safe to import into server or client
 * components (the callers that need the locale are client).
 */

import type { Chapter } from "@/lib/i18n/dictionaries";

export type { Chapter };

/** Names flanking the portrait — proper nouns, identical across locales. */
export const NAME_LEFT = "HUY";
export const NAME_RIGHT = "LE";

/** Strip trailing punctuation so accent matching works on the bare word. */
function bareWord(word: string) {
  return word.replace(/[—.,:;]/g, "");
}

/**
 * Renders text as individual `[data-word]` spans (inline-block, so each can be
 * transformed independently for the word-by-word reveal). Accent words (a set of
 * single tokens for the active locale) keep the lime accent. Spacing comes from
 * a right margin, not whitespace, so inline-block words don't collapse gaps.
 */
export function Words({
  text,
  accentWords,
}: {
  text: string;
  accentWords: readonly string[];
}) {
  const accent = new Set(accentWords);
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          data-word
          className={`inline-block will-change-transform ${
            accent.has(bareWord(word)) ? "text-accent-outline" : ""
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
  accentWords,
  bodyClassName,
}: {
  chapter: Chapter;
  accentWords: readonly string[];
  bodyClassName?: string;
}) {
  return (
    <>
      {chapter.kicker && <p className="eyebrow mb-3">{chapter.kicker}</p>}
      {chapter.heading && (
        <p aria-hidden className="display mb-6 text-5xl text-fg sm:text-7xl">
          <Words text={chapter.heading} accentWords={accentWords} />
        </p>
      )}
      <p className={bodyClassName}>
        <Words text={chapter.body} accentWords={accentWords} />
      </p>
    </>
  );
}

/** Static fallback (no-JS / reduced motion): every chapter stacked and readable. */
export function AboutBio({
  chapters,
  person,
  className,
}: {
  chapters: Chapter[];
  person: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="eyebrow">{person}</p>
      <h2 className="display text-4xl text-fg sm:text-6xl">{person}</h2>
      <p className="text-xl leading-relaxed text-fg">{chapters[0]?.body}</p>
      <div className="space-y-4 text-base leading-relaxed text-fg-muted sm:text-lg">
        {chapters.slice(1).map((c, i) => (
          <p key={i}>{c.body}</p>
        ))}
      </div>
    </div>
  );
}
