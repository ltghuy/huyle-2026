import Image from "next/image";
import { AboutBio, NAME_LEFT, NAME_RIGHT } from "./AboutCopy";

/**
 * "The Person" — a Scroll Zoom Portal (à la gsapvault.com/effects/scroll-zoom-portal).
 *
 * This section is BOTH the scroll track and the no-JS / reduced-motion fallback.
 *
 *  - Fallback (what you see here): a static editorial layout — the name flanks the
 *    portrait (HUY · portrait · LE) with the bio below. Fully readable, no JS.
 *
 *  - With JS + motion, `ScrollPortrait` (a fixed layer, rendered in the root
 *    layout) takes over: the hero portrait flies in and docks centre-stage flanked
 *    by "HUY" / "LE"; then, as you scroll this section, the portrait zooms outward
 *    and the name parts left/right (rising letter-spacing + blur) while the About
 *    copy fades in, centred — "stepping through the portal". ScrollPortrait sets
 *    this section tall (its scroll length drives the scrub) and marks the fallback
 *    `data-portal-js` (visually hidden, still there for screen readers), so all the
 *    motion lives in that one fixed layer and nothing can overlap the next section.
 */
export function About() {
  return (
    <section id="about" className="relative overflow-hidden">
      {/* Static fallback + accessible copy. JS hides it visually (see data-portal-js)
          but leaves it in the a11y tree; the fixed portal layer is aria-hidden. */}
      <div
        data-about-fallback
        className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-24 sm:px-12 lg:px-20"
      >
        <div className="grid w-full items-center gap-y-12">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
            <span
              aria-hidden
              className="display justify-self-end text-right text-fg text-[clamp(2.5rem,11vw,9rem)] leading-none"
            >
              {NAME_LEFT}
            </span>

            <div className="relative aspect-[700/959] w-[clamp(9rem,30vw,22rem)]">
              <div className="absolute inset-0 overflow-hidden rounded-2xl border border-accent/15 shadow-lg">
                <Image
                  src="/assets/evan.png"
                  alt=""
                  fill
                  sizes="(max-width: 640px) 60vw, 352px"
                  className="object-cover"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-accent/10"
                />
              </div>
            </div>

            <span
              aria-hidden
              className="display justify-self-start text-left text-fg text-[clamp(2.5rem,11vw,9rem)] leading-none"
            >
              {NAME_RIGHT}
            </span>
          </div>

          <AboutBio className="mx-auto max-w-2xl space-y-5 text-center sm:text-left" />
        </div>
      </div>
    </section>
  );
}
