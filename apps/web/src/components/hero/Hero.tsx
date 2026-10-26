"use client";

import { HeroPortrait } from "@/components/hero/HeroPortrait";
import { HeroVietnamMap } from "@/components/hero/HeroVietnamMap";
import { HeroScrollSpine } from "@/components/hero/HeroScrollSpine.client";
import { HeroDoodles } from "@/components/hero/HeroDoodles.client";
import { useLocale } from "@/lib/i18n/LocaleProvider.client";
import { useContent } from "@/lib/i18n/useContent.client";

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
  const { t } = useLocale();
  const { profile } = useContent();
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
          {profile.name} ({profile.display}) — {profile.title}
        </h1>

        {/* Visual stack: the oversized role as the two-line "spine", with the
            portrait pulled up to straddle its lower line (in front) and hang
            below it. Tuned so the word stays readable — nothing important hidden. */}
        <div className="relative flex flex-col items-center">
          <div className="glow-blob left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 opacity-60 hero-drift-fast" />

          {/* Hidden ground graphic: the Vietnam silhouette, sitting in the rear
              of the wordmark + portrait as a low-opacity accent watermark. z-0
              keeps it behind the type (z-10) and portrait (z-20); it rides the
              slow parallax group so it drifts with the wordmark. */}
          <HeroVietnamMap className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[125%] w-auto -translate-x-1/2 -translate-y-1/2 text-accent opacity-[0.07] hero-drift-slow" />

          {/* The oversized role, rendered statically as the type-spine. (The
              per-letter spring-in/rotation was removed for performance — no
              per-glyph GSAP timeline or will-change on the wordmark.) */}
          <p
            aria-hidden
            data-hero-title
            className="display-hero hero-drift-slow relative z-10 text-center text-fg"
          >
            <span className="block">Software</span>
            <span className="block">Engineer</span>
          </p>

          {/* Portrait sits BELOW the type (Majd-style), centered — not overlapping */}
          <HeroPortrait className="relative z-20 mt-8 sm:mt-8" />
        </div>

        {/* Editorial corner runners (à la Majd): a large bold ©year bottom-left,
            a small mono "since" label bottom-right. Anchored to the type-spine's
            corners on sm+ (where the spine fills the frame). */}
        <span
          aria-hidden
          data-hero-copyright
          data-fonts-gate
          className="display hero-drift-fast absolute bottom-0 left-0 hidden text-fg text-[clamp(1.75rem,4vw,3rem)] leading-none sm:block"
        >
          ©{COPYRIGHT_YEAR}
        </span>
        <span
          aria-hidden
          data-fonts-gate
          className="runner-label hero-drift-fast absolute bottom-1 right-0 hidden sm:block"
        >
          / {t.hero.runnerSince} {SINCE_YEAR}
        </span>
      </HeroScrollSpine>

      {/* On mobile the centered type-spine is shorter than the viewport, so the
          spine-anchored ©year would float mid-screen. Pin it to the hero
          section's bottom-left instead (matching the section's px-6 gutter). */}
      <span
        aria-hidden
        data-fonts-gate
        className="display absolute bottom-8 left-1/2 -translate-x-1/2 text-fg text-[clamp(1.75rem,4vw,3rem)] leading-none sm:hidden"
      >
        ©{COPYRIGHT_YEAR}
      </span>
    </section>
  );
}
