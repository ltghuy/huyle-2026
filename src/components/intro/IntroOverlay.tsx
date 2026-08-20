"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { markIntroComplete } from "@/lib/useIntroComplete";
import { EVAN_MARK } from "@/lib/evanMark";

/**
 * First-load intro — the "Evan" wordmark becomes the core of the vortex.
 *
 * An opaque tint covers the Hero while the "Evan" wordmark is written on in one
 * continuous pen stroke (a single dash sweep across the joined path, so the tip
 * never lifts). When the draw finishes it hands off to the vortex (IntroVortex):
 * the wordmark stays centred, spinning and spiralling inward while it GRADUALLY
 * fades out — gone by the time the vortex reveals the Hero. The page itself is
 * caught in the same swirl, spinning several turns to a stop on the revealed Hero.
 * One continuous motion, intro → vortex → hero.
 * Plays on every load; skipped entirely under reduced motion and with JS disabled
 * (nothing is server-rendered, so the site is never blocked).
 */

// Mirror IntroVortex's own DURATION so the wordmark's exit lines up with the vortex
// fading to reveal the hero. The wordmark spins, spirals inward and fades away
// entirely within that window, so it's gone by the time the hero is revealed.
const VORTEX_DURATION = 2.2;
const WORDMARK_EXIT = VORTEX_DURATION; // 2.2s

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

    // Hand off from the drawn wordmark to the vortex: arm the vortex and fade the
    // tint so the shapes spiralling behind it show through (the vortex's own opaque
    // page — same colour — keeps the hero covered until it reveals). The spin/shrink
    // exit itself lives on the timeline. Idempotent, so skip can't double it.
    const handOff = () => {
      if (handedOff) return;
      handedOff = true;
      markIntroComplete();
      // The vortex now owns the screen; the overlay is just the spinning core
      // dissolving out — stop it trapping input and release the scroll lock.
      overlay.style.pointerEvents = "none";
      document.body.style.overflow = "";
      // Delay a touch so the vortex canvas has mounted and painted opaque before
      // the tint thins — the hero never peeks through the crossfade.
      gsap.to(scrim, { autoAlpha: 0, duration: 0.4, delay: 0.15, ease: "power1.out" });
    };

    // The wordmark's exit, positioned against a "drawn" label (shared by the play
    // and skip paths): the spin accelerates (power-in ease) while the mark spirals
    // inward, shrinking to nothing about its own centre, and it GRADUALLY fades the
    // whole way — starting soon after the draw and gone before the hero settles in.
    const spinOut = (t: gsap.core.Timeline) => {
      t.to(
        svg,
        { rotation: "+=1080", duration: WORDMARK_EXIT, ease: "power1.in" },
        "drawn",
      )
        .to(svg, { scale: 0, duration: WORDMARK_EXIT, ease: "none" }, "drawn")
        // Linear, gradual fade from 0.5s in to 0.2s before the reveal completes.
        .to(
          svg,
          { autoAlpha: 0, duration: WORDMARK_EXIT - 0.7, ease: "none" },
          "drawn+=0.5",
        );
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
      // Prime: hide the stroke; spin/shrink about the wordmark's own centre.
      const markLen = mark.getTotalLength();
      gsap.set(mark, { strokeDasharray: markLen, strokeDashoffset: markLen });
      gsap.set(svg, { transformOrigin: "center center" });

      const timeline = gsap.timeline({ onComplete: finish });
      tl = timeline;

      timeline
        // 1) Write the whole name in one continuous pen stroke.
        .to(mark, { strokeDashoffset: 0, duration: 1.4, ease: "power1.inOut" })
        .addLabel("drawn", "+=0.2")
        // 2) Hand off, then spin/shrink into the vortex core.
        .add(handOff, "drawn");
      spinOut(timeline);
    });

    // Let visitors skip the draw. Once handed off, the vortex plays out on its own.
    const skip = () => {
      if (finished || handedOff) return;
      tl?.kill();
      gsap.set(mark, { strokeDashoffset: 0 }); // finish the draw instantly
      handOff();
      const rt = gsap.timeline({ onComplete: finish });
      rt.addLabel("drawn", 0);
      spinOut(rt);
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

      {/* The wordmark: one continuous open stroke; drawn on, then spun and shrunk into the vortex core */}
      <svg
        ref={svgRef}
        viewBox={EVAN_MARK.viewBox}
        aria-hidden
        style={{
          position: "relative",
          width: "min(84vw, 820px)",
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
