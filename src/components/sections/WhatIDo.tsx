"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { skillGroups } from "@/content/skills";
import { Reveal } from "@/components/motion/Reveal";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

/** Seconds for a ring to complete one full revolution (at v = 1). */
const LOOP_SECONDS = 15;
/** Resting angular velocity when the pointer isn't steering (gentle drift). */
const BASE_VELOCITY = 0.6;
/** Starting font size (user units); auto-shrunk so the copy fills the ring once. */
const BASE_FONT = 220;

/** The four capability areas, uppercased (full names for the accessible list). */
const CATEGORIES = skillGroups.map((g) => g.label.toUpperCase());
/** Shorter forms shown ON the ring so the type can be much larger; the full
 *  names stay in the sr-only list and the reduced-motion fallback. Order matches
 *  `skillGroups` (frontend · ai-native · backend/apis · testing & quality). */
const RING_LABELS = ["FRONTEND", "AI", "BACKEND", "QUALITY"];

/** Per-word look on the SOLID ring, cycled: cream/lime × solid/outline so no two
 *  neighbours match (there are four areas → each gets a distinct treatment). */
const WORD_STYLES: React.CSSProperties[] = [
  { fill: "var(--color-fg)" }, // solid cream
  { fill: "none", stroke: "var(--color-accent)", strokeWidth: 2 }, // outline lime
  { fill: "var(--color-accent)" }, // solid lime
  { fill: "none", stroke: "var(--color-fg)", strokeWidth: 2 }, // outline cream
];
/** The second ring is ALL outline (alternating cream/lime) so the two rings read
 *  as distinct layers where they intersect. */
const WORD_STYLES_OUTLINE: React.CSSProperties[] = [
  { fill: "none", stroke: "var(--color-fg)", strokeWidth: 2 }, // outline cream
  { fill: "none", stroke: "var(--color-accent)", strokeWidth: 2 }, // outline lime
];

/** Vertical squash that reads each circle as a flat oval. The squash + tilt are
 *  *static* container transforms, so the rigid spin stays seamless. */
const SQUASH = 0.44;
/** The two rings are CONCENTRIC (no offset) and tilted in opposite diagonals, so
 *  the two flat ovals cross to form an 'X'. They also spin opposite directions. */
const RINGS = [
  { id: "cap-ring-a", direction: 1, tilt: 32, outline: false },
  { id: "cap-ring-b", direction: -1, tilt: -32, outline: true },
] as const;

/** Circle geometry in SVG user units (viewBox is derived from these). A circle —
 *  not an ellipse — because the ring is animated by *rigidly rotating* the whole
 *  text group: rotation is a symmetry of a circle, so the shape never changes and
 *  the text simply travels clockwise. The copy is laid out once around the circle
 *  and never scrubbed, so there is nothing for SVG textPath to clip — no gap, no
 *  seam pop, no doubling, ever. */
const R = 520;
const PAD = 90; // room for the glyphs, which straddle the path (±½ font)
const CENTER = R + PAD;
const VIEW = CENTER * 2;
// Closed circle, clockwise (sweep 1), starting at the left point.
const CIRCLE_PATH = `M ${PAD},${CENTER} a ${R},${R} 0 1,1 ${R * 2},0 a ${R},${R} 0 1,1 ${-R * 2},0`;

/**
 * The "Capabilities" loop: the four capability areas form a closed ring that
 * rotates continuously clockwise.
 *
 * The copy is laid out ONCE around a circle (`textLength` snaps it to the exact
 * circumference, so the "… ✳ WORD" join is seamless) and the whole text group is
 * spun by a GSAP ticker via a rigid `rotate()` transform. Because it's a rigid
 * rotation of a full, static layout, no glyph is ever added, removed, clipped, or
 * doubled — the ring just turns. The pointer only modulates an always-positive
 * angular speed (it never reverses or stops).
 *
 * Progressive enhancement: with no JS or under reduced motion the four areas
 * render as a static wrapped list (all visible, nothing moving).
 */
export function WhatIDo() {
  const reduced = usePrefersReducedMotion();

  return (
    <section id="what-i-do" className="overflow-hidden py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-12 lg:px-20">
        <Reveal>
          <p className="eyebrow mb-3">What I Do</p>
          <h2 className="display text-4xl text-fg sm:text-6xl">Capabilities</h2>
        </Reveal>

        {/* The moving loop is decorative to AT; expose the areas as a list. */}
        <ul className="sr-only">
          {CATEGORIES.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>

      {reduced ? <StaticList /> : <CapabilitiesLoop />}
    </section>
  );
}

function StaticList() {
  return (
    <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 text-center display text-4xl uppercase leading-none tracking-tight text-fg sm:text-6xl">
      {CATEGORIES.map((label, i) => (
        <Fragment key={label}>
          {i > 0 && (
            <span aria-hidden className="text-accent">
              ✳
            </span>
          )}
          <span>{label}</span>
        </Fragment>
      ))}
    </div>
  );
}

function CapabilitiesLoop() {
  const stageRef = useRef<HTMLDivElement>(null);
  // Shared angular velocity: both rings read it, spinning in opposite directions,
  // so the pointer steers the whole pair at once (always-positive → never stops).
  const velRef = useRef({ v: BASE_VELOCITY });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const velTo = gsap.quickTo(velRef.current, "v", {
      duration: 0.5,
      ease: "power2.out",
    });
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const fx = gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width);
      velTo(0.35 + fx * 1.85); // 0.35× (left) → 2.2× (right)
    };
    const onLeave = () => velTo(BASE_VELOCITY);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="relative mt-6 h-[82vh] min-h-[620px] w-full"
    >
      {RINGS.map((ring) => (
        <Ring key={ring.id} {...ring} velRef={velRef} />
      ))}
    </div>
  );
}

function Ring({
  id,
  direction,
  tilt,
  outline,
  velRef,
}: Readonly<{
  id: string;
  direction: number;
  tilt: number;
  outline: boolean;
  velRef: React.RefObject<{ v: number }>;
}>) {
  const pathRef = useRef<SVGPathElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const groupRef = useRef<SVGGElement>(null);

  const [ready, setReady] = useState(false);
  // Auto-shrunk so the copy fills the circumference once without `textLength`
  // having to compress (overlap) glyphs — the largest legible size that fits.
  const [fontSize, setFontSize] = useState(BASE_FONT);

  // Measure (after fonts load, and on resize): snap the copy to the exact
  // circumference, shrinking the font if it would otherwise overflow.
  useLayoutEffect(() => {
    const path = pathRef.current;
    const text = textRef.current;
    if (!path || !text) return;
    let cancelled = false;

    const fit = () => {
      if (cancelled) return;
      const len = path.getTotalLength();
      text.removeAttribute("textLength");
      const natural = text.getComputedTextLength();
      if (!natural) return;
      if (natural > len) {
        setFontSize((f) => Math.max(24, Math.floor((f * len) / natural)));
      }
      text.setAttribute("textLength", String(len));
      text.setAttribute("lengthAdjust", "spacing");
      setReady(true);
    };

    // Fallback fonts are narrower than the display face, so re-fit once loaded.
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", fit);
    };
  }, [fontSize]);

  // Spin: rigidly rotate the whole text group by `direction` × the shared
  // velocity. No startOffset scrubbing, so no glyph is ever clipped or doubled.
  useEffect(() => {
    const group = groupRef.current;
    if (!group || !ready) return;
    const degPerSec = 360 / LOOP_SECONDS;
    let angle = 0;
    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 50) / 1000;
      angle = (angle + direction * velRef.current.v * degPerSec * dt + 360) % 360;
      group.setAttribute("transform", `rotate(${angle} ${CENTER} ${CENTER})`);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [ready, direction, velRef]);

  // Each unit is a WORD (in its cycled cream/lime · solid/outline style) followed
  // by an accent star, so every join ("… ✳ WORD") matches — including the
  // wrap-around at the circle's start/end point.
  const styles = outline ? WORD_STYLES_OUTLINE : WORD_STYLES;
  const content = RING_LABELS.map((label, i) => (
    <Fragment key={`${i}-${label}`}>
      <tspan style={styles[i % styles.length]}>{label}</tspan>
      <tspan fill="var(--color-accent)">{" ✳ "}</tspan>
    </Fragment>
  ));

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 w-[min(84vw,1150px)]"
      style={{
        transform: `translate(-50%, -50%) rotate(${tilt}deg) scaleY(${SQUASH})`,
      }}
    >
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="h-auto w-full overflow-visible"
        aria-hidden
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize,
          letterSpacing: "0.01em",
        }}
      >
        <defs>
          <path id={id} ref={pathRef} d={CIRCLE_PATH} fill="none" />
        </defs>
        <g ref={groupRef}>
          <text ref={textRef} dominantBaseline="middle">
            <textPath href={`#${id}`} startOffset={0}>
              {content}
            </textPath>
          </text>
        </g>
      </svg>
    </div>
  );
}
