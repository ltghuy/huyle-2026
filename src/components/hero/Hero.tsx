import { profile } from "@/content/profile";
import { HeroPortrait } from "@/components/hero/HeroPortrait";
import { HeroScrollSpine } from "@/components/hero/HeroScrollSpine.client";
import { HeroDoodles } from "@/components/hero/HeroDoodles.client";
import { ScrambleText } from "@/components/motion/ScrambleText";

/** Runner-label copy. `SINCE_YEAR` = start of the professional timeline (4+ yrs). */
const SINCE_YEAR = 2021;
const COPYRIGHT_YEAR = 2026;

/**
 * The type-as-spine hero (feature 002 — editorial re-style, majd-modeled).
 *
 * The oversized role ("SOFTWARE ENGINEER") is the page's single largest element;
 * the interim portrait is pulled up to straddle its lower line (in front) and
 * extend below, threading through the type. The visible name lives in the nav
 * (à la Majd) — this section's only real text is an sr-only h1 carrying the name
 * + title for SEO / no-JS / screen readers. Two editorial corner "runner" labels
 * are kept; everything else is intentionally stripped.
 */
export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] items-center overflow-hidden px-6 py-28 sm:px-12 lg:px-20"
    >
      {/* Hand-drawn white doodles that sketch into the empty flanks (DrawSVG) */}
      <HeroDoodles />

      <HeroScrollSpine className="relative mx-auto w-full max-w-6xl">
        {/* Accessible identity — the visible name is the nav logo (Majd-style);
            this sr-only h1 carries name + title for SEO / no-JS / screen readers. */}
        <h1 className="sr-only">
          {profile.display} — {profile.title}
        </h1>

        {/* Visual stack: the oversized role as the two-line "spine", with the
            portrait pulled up to straddle its lower line (in front) and hang
            below it. Tuned so the word stays readable — nothing important hidden. */}
        <div className="relative flex flex-col items-center">
          <div className="glow-blob left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 opacity-60 hero-drift-fast" />

          {/* The oversized role decodes from static immediately on mount (à la
              the "text decode" reference), one word after the other. */}
          <p
            aria-hidden
            data-hero-title
            className="display-hero hero-drift-slow relative z-10 text-center text-fg"
          >
            <ScrambleText
              text="Software"
              duration={1100}
              waitForIntro
              className="block"
            />
            <ScrambleText
              text="Engineer"
              delay={220}
              duration={1100}
              waitForIntro
              className="block"
            />
          </p>

          {/* Portrait sits BELOW the type (Majd-style), centered — not overlapping */}
          <HeroPortrait className="relative z-20 mt-4 sm:mt-8" />
        </div>

        {/* Editorial corner runners (à la Majd): a large bold ©year bottom-left,
            a small mono "since" label bottom-right. */}
        <span
          aria-hidden
          data-hero-copyright
          className="display hero-drift-fast absolute bottom-0 left-0 text-fg text-[clamp(1.75rem,4vw,3rem)] leading-none"
        >
          ©{COPYRIGHT_YEAR}
        </span>
        <span
          aria-hidden
          className="runner-label hero-drift-fast absolute bottom-1 right-0 hidden sm:block"
        >
          / Engineering since {SINCE_YEAR}
        </span>
      </HeroScrollSpine>
    </section>
  );
}
