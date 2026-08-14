import { profile } from "@/content/profile";
import { HeroWordmark } from "@/components/hero/HeroWordmark";
import { HeroExperience } from "@/components/hero/HeroExperience.client";
import { HeroScrollSpine } from "@/components/hero/HeroScrollSpine.client";
import { ScrambleText } from "@/components/motion/ScrambleText";

/** Runner-label copy. `SINCE_YEAR` = start of the professional timeline (4+ yrs). */
const SINCE_YEAR = 2021;
const COPYRIGHT_YEAR = 2026;

/**
 * The type-as-spine hero (feature 002 — editorial re-style).
 *
 * The oversized "Evan" wordmark is the page's single largest element (the
 * "spine"); the interactive 3D scene is stacked in the same grid cell so the
 * character overlaps the letterforms. Real, server-rendered text carries the
 * accessible identity (name + title) for SEO / no-JS / screen readers, while the
 * wordmark and scene are decorative (`aria-hidden`). Editorial "runner" labels
 * are pinned to the corners.
 *
 * Fallback: `HeroExperience` swaps to the static `HeroPoster` when WebGL is
 * unavailable or motion is reduced, so the cell is never empty. `min-h` reserves
 * space to keep layout shift small while fonts/scene load.
 */
export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] items-center overflow-hidden px-6 py-28 sm:px-12 lg:px-20"
    >
      <HeroScrollSpine className="relative mx-auto w-full max-w-6xl">
        {/* Stacked visual: wordmark spine + overlapping scene, same grid cell */}
        <div className="relative grid place-items-center">
          <div className="glow-blob left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 opacity-60 hero-drift-fast" />

          {/* The name as the spine — oversized, drawn-on, decorative */}
          <HeroWordmark
            className="hero-drift-slow relative z-10 col-start-1 row-start-1"
            widthClamp="min(100%, 72rem)"
          />

          {/* The interactive scene overlaps the letterforms (transparent canvas) */}
          <div className="pointer-events-none col-start-1 row-start-1 h-[24rem] w-full sm:h-[30rem] lg:h-[34rem] z-20">
            <HeroExperience />
          </div>
        </div>

        {/* Accessible identity — real text (SEO / no-JS / screen readers). The
            oversized wordmark is the *visual* name; this is the semantic one: a
            single h1 with the name, the title as its readable subtitle. */}
        <div className="relative z-30 mt-8 text-center">
          <h1 className="eyebrow mb-3">{profile.display}</h1>
          <ScrambleText
            waitForIntro
            text={profile.title}
            className="display block text-xl text-fg sm:text-2xl"
          />
          <p className="mt-4 text-sm text-fg-muted">{profile.tagline}</p>
        </div>

        {/* Editorial runner labels — decorative, pinned to the hero corners */}
        <span aria-hidden className="runner-label hero-drift-fast absolute left-0 top-0">
          {profile.monogram}
        </span>
        {/* Bottom runners are decorative editorial flourish — hidden on small
            screens where they would collide with the centered identity text. */}
        <span
          aria-hidden
          className="runner-label hero-drift-fast absolute bottom-0 left-0 hidden sm:block"
        >
          ©{COPYRIGHT_YEAR}
        </span>
        <span
          aria-hidden
          className="runner-label hero-drift-fast absolute bottom-0 right-0 hidden sm:block"
        >
          / Engineering since {SINCE_YEAR}
        </span>
      </HeroScrollSpine>
    </section>
  );
}
