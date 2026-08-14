"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { markIntroComplete } from "@/lib/useIntroComplete";
import { EVAN_MARK } from "@/lib/evanMark";

/**
 * First-visit "handwritten" intro (inspired by beetogreen.com). On the very
 * first load in a browser, an overlay covers the page and the name "Evan" is
 * written on in one continuous pen stroke, then it zooms away and a dark-lime
 * wave field sweeps up from the bottom before the overlay lifts to reveal the site.
 *
 * The "Evan" mark is a single open monoline path (E → v → a → n all joined). The
 * write-on is one dash sweep across that path, so the pen tip never lifts — the
 * whole word is drawn as a single connected stroke.
 *
 * Gating: plays on every load / refresh. Skipped entirely under reduced motion
 * and with JS disabled (nothing is server-rendered, so the site is never
 * blocked). The overlay is mounted in a layout effect before first paint, so the
 * page underneath never flashes.
 */

// The "Evan" wordmark (single continuous monoline stroke) — shared with the hero.
const {
  viewBox: VIEW_BOX,
  strokeWidth: STROKE_WIDTH,
  path: EVAN_PATH,
  ink: INK,
} = EVAN_MARK;

// Stacked wave layers (viewBox 0..100, stretched to the viewport) — colours ramp
// from the dark base at the top to lime at the bottom, each with a rippling top
// edge that undulates. The front (lime) layer also has a wavy bottom, which
// becomes the reveal edge as the whole scene lifts away.
interface WaveLayer {
  color: string;
  top: number; // baseline of the wavy top edge
  amp: number; // amplitude of the ripple
  bumps: number; // number of ripples across the width
  phase: number; // starting phase offset
  speed: number; // travel speed/direction
  wavyBottom?: boolean;
}
const WAVE_LAYERS: WaveLayer[] = [
  { color: "#18281f", top: 15, amp: 7, bumps: 2.5, phase: 0.0, speed: 1.0 },
  { color: "#2f4d29", top: 32, amp: 8, bumps: 2.0, phase: 1.1, speed: -0.8 },
  { color: "#527f2c", top: 49, amp: 8, bumps: 2.5, phase: 2.2, speed: 0.9 },
  { color: "#8bb636", top: 66, amp: 7, bumps: 2.0, phase: 3.1, speed: -1.0 },
  { color: "#b9dd42", top: 80, amp: 7, bumps: 2.5, phase: 4.0, speed: 0.8 },
  { color: INK, top: 92, amp: 6, bumps: 2.0, phase: 5.0, speed: -0.9, wavyBottom: true },
];

const f2 = (n: number) => n.toFixed(2);

/** Points sampled along a sine edge (left→right, or reversed for a bottom edge). */
function sineEdge(
  baseline: number,
  amp: number,
  phase: number,
  bumps: number,
  reversed: boolean,
): [number, number][] {
  const N = 10;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = reversed ? 100 - t * 100 : t * 100;
    const k = reversed ? N - i : i;
    const y = baseline - amp * Math.sin((bumps * 2 * Math.PI * k) / N + phase);
    pts.push([x, y]);
  }
  return pts;
}
/** Smooth (Catmull-Rom → cubic) curve through the sampled points. */
function smooth(pts: [number, number][]): string {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${f2(c1x)} ${f2(c1y)} ${f2(c2x)} ${f2(c2y)} ${f2(p2[0])} ${f2(p2[1])}`;
  }
  return d;
}
/** Filled layer path: wavy top edge, down to a straight or wavy bottom. */
function buildLayerPath(layer: WaveLayer, phase: number): string {
  const topPts = sineEdge(layer.top, layer.amp, phase, layer.bumps, false);
  let d = `M ${f2(topPts[0][0])} ${f2(topPts[0][1])}${smooth(topPts)}`;
  if (layer.wavyBottom) {
    const botPts = sineEdge(112, 8, phase * 0.8 + 1.5, layer.bumps, true);
    d += ` L ${f2(botPts[0][0])} ${f2(botPts[0][1])}${smooth(botPts)} Z`;
  } else {
    d += ` L 100 112 L 0 112 Z`;
  }
  return d;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function IntroOverlay() {
  const [show, setShow] = useState(false);
  const decided = useRef(false);
  const reduced = usePrefersReducedMotion();

  const overlayRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const markRef = useRef<SVGPathElement>(null);
  const sceneRef = useRef<SVGSVGElement>(null);
  const layerRefs = useRef<(SVGPathElement | null)[]>([]);

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
    const mark = markRef.current;
    if (!overlay || !mark) return;

    const content = document.getElementById("site-content");

    let finished = false;
    let tl: gsap.core.Timeline | undefined;
    const finish = () => {
      if (finished) return;
      finished = true;
      document.body.style.overflow = "";
      if (content)
        gsap.set(content, { clearProps: "transform,opacity,visibility" });
      markIntroComplete(); // let the hero start its (one-shot) animations
      setShow(false);
    };

    document.body.style.overflow = "hidden";

    // The final transition: the layered wave scene lifts away (its front lime
    // layer's wavy bottom leading) while the site content slides up beneath it.
    const slideUp = (
      timeline: gsap.core.Timeline,
      at: gsap.Position,
      dur: number,
    ) => {
      timeline.to(
        overlay,
        { yPercent: -122, duration: dur, ease: "power3.inOut" },
        at,
      );
      if (content) {
        timeline.to(
          content,
          { y: 0, autoAlpha: 1, duration: dur, ease: "power3.inOut" },
          `${at}+=${dur * 0.08}`,
        );
      }
    };

    const ctx = gsap.context(() => {
      // Prime the single pen stroke: dash the whole outline and hide it.
      const markLen = mark.getTotalLength();
      gsap.set(mark, { strokeDasharray: markLen, strokeDashoffset: markLen });
      // Park the wave field one screen below, ready to sweep up from the bottom.
      gsap.set(sceneRef.current, { yPercent: 100 });
      // Park the site content just below the fold, hidden, ready to slide up.
      if (content) gsap.set(content, { y: 90, autoAlpha: 0 });

      // Continuously travel the wave layers (procedurally regenerate each path)
      // so the colour field keeps rippling through the hold and the lift.
      const phaseObj = { p: 0 };
      const render = () => {
        WAVE_LAYERS.forEach((layer, i) => {
          const el = layerRefs.current[i];
          if (el) {
            el.setAttribute(
              "d",
              buildLayerPath(layer, phaseObj.p * layer.speed + layer.phase),
            );
          }
        });
      };
      render();
      gsap.to(phaseObj, {
        p: Math.PI * 2,
        duration: 7,
        ease: "none",
        repeat: -1,
        onUpdate: render,
      });

      const timeline = gsap.timeline({ onComplete: finish });
      tl = timeline;
      // 1) Write the whole name in one continuous pen stroke — a single dash
      // sweep across the one open path, so the tip never lifts between letters.
      timeline
        .to(mark, {
          strokeDashoffset: 0,
          duration: 1.3,
          ease: "power1.inOut",
        })
        .addLabel("written", "+=0.1")
        // 2) Zoom the name straight at the viewer until it flies off-screen and
        // fades out. As it dives in, the ground linearly cross-fades from the
        // base colour to the morphing field's dark-lime, so the two are already
        // matched by the time the name is gone.
        .to(
          svgRef.current,
          {
            scale: 22,
            transformOrigin: "50% 50%",
            duration: 0.85,
            ease: "power2.in",
          },
          "written",
        )
        .to(
          overlayRef.current,
          { backgroundColor: WAVE_LAYERS[0].color, duration: 0.85, ease: "none" },
          "written",
        )
        .to(
          svgRef.current,
          { autoAlpha: 0, duration: 0.35, ease: "power1.in" },
          "written+=0.5",
        )
        .addLabel("gone")
        // 3) The layered wave field sweeps up from the bottom of the screen
        // (its rippling edges keep morphing) over the now-matched dark ground.
        .to(
          sceneRef.current,
          { autoAlpha: 1, yPercent: 0, duration: 0.75, ease: "power2.out" },
          "gone",
        )
        .addLabel("zoomed");
      // Brief beat on the rippling colour field, then lift the whole scene away
      // as the site slides up beneath it.
      slideUp(tl, "zoomed+=0.3", 0.8);
    });

    // Let visitors skip straight to the slide-up reveal.
    const skip = () => {
      if (finished) return;
      tl?.kill();
      const rt = gsap.timeline({ onComplete: finish });
      slideUp(rt, 0, 0.6);
    };
    overlay.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);

    return () => {
      ctx.revert();
      overlay.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      document.body.style.overflow = "";
      if (content)
        gsap.set(content, { clearProps: "transform,opacity,visibility" });
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={overlayRef}
      role="img"
      aria-label="Evan"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-base, #0b1510)",
        cursor: "pointer",
        overflow: "visible",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={VIEW_BOX}
        aria-hidden
        style={{
          width: "min(90vw, 960px)",
          height: "auto",
          overflow: "visible",
          filter: `drop-shadow(0 0 16px rgba(215,242,74,0.22))`,
        }}
      >
        {/* The wordmark as one continuous open stroke; the draw-on animation
            sweeps a single dash across it, so the pen never lifts. */}
        <path
          ref={markRef}
          d={EVAN_PATH}
          fill="none"
          stroke={INK}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Full-screen stacked wave layers (dark → lime, top → bottom). Hidden
          during the write, revealed as the colour field, then lifted away. */}
      <svg
        ref={sceneRef}
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
          opacity: 0,
          visibility: "hidden",
        }}
      >
        {WAVE_LAYERS.map((layer, i) => (
          <path
            key={layer.color}
            ref={(el) => {
              layerRefs.current[i] = el;
            }}
            fill={layer.color}
          />
        ))}
      </svg>
    </div>
  );
}
