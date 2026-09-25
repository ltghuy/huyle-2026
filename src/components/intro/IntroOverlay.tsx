"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { markIntroComplete } from "@/lib/useIntroComplete";
import { EVAN_MARK } from "@/lib/evanMark";

/**
 * First-load intro — the "Evan" wordmark is drawn on, then bows out.
 *
 * An opaque tint covers the Hero while the "Evan" wordmark is written on in one
 * continuous pen stroke (a single dash sweep across the joined path, so the tip
 * never lifts). When the draw finishes, the wordmark fades out (no spin, no zoom)
 * while the tint still hides the Hero — so "EVAN" is never seen over the page —
 * and only then does the tint fade to reveal the clean Hero.
 * Plays on every load; skipped entirely under reduced motion and with JS disabled
 * (nothing is server-rendered, so the site is never blocked).
 */

// Intro exit timing: "EVAN" fades out first (while the tint still hides the Hero),
// then the tint fades to reveal the clean Hero — so the wordmark is never seen
// over the page.
const EVAN_FADE = 0.4; // seconds — wordmark fade-out (on the opaque tint)
const TINT_FADE = 0.5; // seconds — tint fade-out (reveals the Hero)

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function IntroOverlay() {
  const [show, setShow] = useState(false);
  const decided = useRef(false);
  const reduced = usePrefersReducedMotion();

  const overlayRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const markRef = useRef<SVGPathElement>(null);

  // Decide before first paint so the page underneath never flashes. Plays on
  // every load; only reduced-motion suppresses it.
  useIsomorphicLayoutEffect(() => {
    if (decided.current) return;
    decided.current = true;
    if (reduced) return; // respect reduced motion: no intro
    setShow(true);
  }, [reduced]);

  useEffect(() => {
    if (!show) return;
    const overlay = overlayRef.current;
    const scrim = scrimRef.current;
    const svg = svgRef.current;
    const mark = markRef.current;
    if (!overlay || !scrim || !svg || !mark) return;

    let finished = false;
    let handedOff = false;
    let tl: gsap.core.Timeline | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      document.body.style.overflow = "";
      // Land at the top of the hero — no residual scroll offset on reveal.
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      setShow(false);
    };

    // Hand off once the name is drawn: mark the intro complete and release input +
    // the scroll lock so the revealed Hero is immediately interactive. The visual
    // reveal (tint fade) lives in the exit timeline below. Idempotent.
    const handOff = () => {
      if (handedOff) return;
      handedOff = true;
      markIntroComplete();
      overlay.style.pointerEvents = "none";
      document.body.style.overflow = "";
    };

    // The intro's exit, anchored at the "drawn" label (shared by the play + skip
    // paths):
    //  1) "EVAN" fades out while the tint STILL HIDES the Hero, so it is never seen
    //     over the page (this was the complaint: the wordmark fading over the hero);
    //  2) hand off (mark complete, release input/scroll);
    //  3) the tint fades to reveal the clean Hero.
    const buildExit = (t: gsap.core.Timeline) => {
      t.to(svg, { autoAlpha: 0, duration: EVAN_FADE, ease: "power1.out" }, "drawn")
        .add(handOff)
        .to(scrim, { autoAlpha: 0, duration: TINT_FADE, ease: "power1.out" });
    };

    document.body.style.overflow = "hidden";
    // Pin to the top and stop the browser from restoring a prior scroll position
    // when overflow is released (that restore nudged the reveal down slightly).
    try {
      history.scrollRestoration = "manual";
    } catch {
      /* not supported — ignore */
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const ctx = gsap.context(() => {
      // Prime: hide the stroke, ready to be drawn on.
      const markLen = mark.getTotalLength();
      gsap.set(mark, { strokeDasharray: markLen, strokeDashoffset: markLen });

      const timeline = gsap.timeline({ onComplete: finish });
      tl = timeline;

      timeline
        // 1) Write the whole name in one continuous pen stroke.
        .to(mark, { strokeDashoffset: 0, duration: 1.4, ease: "power1.inOut" })
        .addLabel("drawn", "+=0.2");
      // 2) Fade "EVAN" out (tint still hiding the Hero), then reveal the Hero.
      buildExit(timeline);
    });

    // Let visitors skip the draw. Once handed off, the vortex plays out on its own.
    const skip = () => {
      if (finished || handedOff) return;
      tl?.kill();
      gsap.set(mark, { strokeDashoffset: 0 }); // finish the draw instantly
      handOff(); // set the guard now so a second skip can't re-enter (idempotent)
      const rt = gsap.timeline({ onComplete: finish });
      rt.addLabel("drawn", 0);
      // Same exit as the play path: "EVAN" fades on the tint, then the Hero reveals.
      buildExit(rt);
      tl = rt;
    };
    overlay.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    return () => {
      ctx.revert();
      tl?.kill();
      overlay.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      document.body.style.overflow = "";
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={overlayRef}
      role="img"
      aria-label="Evan"
      // Above the vortex canvas (z-95) so the wordmark rides on top of its shapes.
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ cursor: "pointer", overflow: "hidden" }}
    >
      {/* Opaque tint over the Hero — fades out to reveal the vortex behind */}
      <div
        ref={scrimRef}
        className="absolute inset-0"
        style={{ background: "var(--color-base, #0b1510)" }}
      />

      {/* The wordmark: one continuous open stroke; drawn on, then faded out */}
      <svg
        ref={svgRef}
        viewBox={EVAN_MARK.viewBox}
        aria-hidden
        style={{
          position: "relative",
          width: "min(92vw, 960px)",
          height: "auto",
          overflow: "visible",
          filter: "drop-shadow(0 0 16px rgba(215,242,74,0.22))",
        }}
      >
        <path
          ref={markRef}
          d={EVAN_MARK.path}
          fill="none"
          stroke={EVAN_MARK.ink}
          strokeWidth={EVAN_MARK.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
