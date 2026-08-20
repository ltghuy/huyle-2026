"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useIntroComplete } from "@/lib/useIntroComplete";

/**
 * Canvas Shape Vortex — the hand-off from the intro into the page
 * (à la https://gsapvault.com/effects/canvas-shape-vortex).
 *
 * The moment the intro overlay reveals the site, a pooled set of glossy shaded
 * shapes (spheres, rings, sparkles, hexagons) spirals out of the centre through a
 * depth tunnel: a GSAP ticker advances each shape's wrapped depth phase, and that
 * phase drives its spiral radius, scale, opacity and rotation. Each shape is drawn
 * as a volumetric sprite — a top-left-lit gradient with a specular glint — so it
 * reads as 3D as it rushes outward and whips past into the hero, while a brief
 * central dim lifts. It plays once, then the canvas clears and unmounts.
 *
 * Decorative + non-blocking: `pointer-events-none`, `aria-hidden`, and it never
 * runs under reduced motion (the intro — and thus this — is skipped there).
 */

const TAU = Math.PI * 2;
const DURATION = 2.2; // seconds the whole vortex "page" is shown
const BG_FADE = 0.6; // final seconds the opaque background fades to reveal the hero
const COUNT = 96; // pooled shape count
const SHAPES = ["sphere", "ring", "dot", "sparkle", "hexagon"] as const;
type Shape = (typeof SHAPES)[number];
type RGB = [number, number, number];

interface Particle {
  a0: number; // base angle
  phase: number; // 0–1 depth offset (staggers the pool)
  speed: number; // depth phases per second
  turns: number; // spiral turns across one depth pass
  spin: number; // self-rotation across one depth pass
  size: number; // base radius in px
  shape: Shape;
  rgb: RGB; // parsed tint (light/dark variants are derived per draw)
}

// Parse a CSS hex ("#rgb"/"#rrggbb") or rgb()/rgba() colour to [r, g, b].
function toRgb(color: string): RGB {
  const c = color.trim();
  if (c[0] === "#") {
    const hex =
      c.length === 4 ? c.slice(1).replace(/./g, (ch) => ch + ch) : c.slice(1);
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/[\d.]+/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [136, 136, 136];
}

// Blend an rgb toward a flat channel value (255 = lighten, 0 = darken) by t∈[0,1].
function tint([r, g, b]: RGB, t: number, target: number): string {
  const f = (v: number) => Math.round(v + (target - v) * t);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
const rgba = ([r, g, b]: RGB, a: number) => `rgba(${r},${g},${b},${a})`;

// A shaded ball: top-left-lit radial gradient (highlight → tint → dark rim) with
// a specular glint on top. The volumetric core of the glossy look.
function glossyBall(ctx: CanvasRenderingContext2D, r: number, rgb: RGB) {
  const body = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
  body.addColorStop(0, tint(rgb, 0.8, 255));
  body.addColorStop(0.5, rgba(rgb, 1));
  body.addColorStop(1, tint(rgb, 0.55, 0));
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  // Specular glint — no bloom on this pass, so kill the shadow first.
  ctx.shadowBlur = 0;
  const spec = ctx.createRadialGradient(
    -r * 0.35,
    -r * 0.35,
    0,
    -r * 0.35,
    -r * 0.35,
    r * 0.55,
  );
  spec.addColorStop(0, "rgba(255,255,255,0.9)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  s: number,
  rgb: RGB,
) {
  switch (shape) {
    case "sphere":
      glossyBall(ctx, s, rgb);
      break;
    case "dot":
      glossyBall(ctx, s * 0.7, rgb);
      break;
    case "ring": {
      // Glossy torus: a vertical light band gives the ring volume.
      ctx.lineWidth = Math.max(2, s * 0.34);
      const g = ctx.createLinearGradient(0, -s, 0, s);
      g.addColorStop(0, tint(rgb, 0.75, 255));
      g.addColorStop(0.5, rgba(rgb, 1));
      g.addColorStop(1, tint(rgb, 0.5, 0));
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, TAU);
      ctx.stroke();
      break;
    }
    case "hexagon": {
      // Beveled facet: a diagonal light→dark fill with a bright top rim.
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * TAU - Math.PI / 2;
        const x = Math.cos(a) * s;
        const y = Math.sin(a) * s;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(-s, -s, s, s);
      g.addColorStop(0, tint(rgb, 0.7, 255));
      g.addColorStop(0.5, rgba(rgb, 1));
      g.addColorStop(1, tint(rgb, 0.55, 0));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1, s * 0.1);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.stroke();
      break;
    }
    case "sparkle": {
      // A glossy 4-point star: a white-hot core bleeding out into the tint.
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.3);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.3, tint(rgb, 0.4, 255));
      g.addColorStop(1, rgba(rgb, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1, s * 0.2);
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * s * 1.3, Math.sin(a) * s * 1.3);
      }
      ctx.stroke();
      break;
    }
  }
}

export function IntroVortex() {
  const introDone = useIntroComplete();
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const played = useRef(false);
  const swirled = useRef(false);
  const swirlTl = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState(false);

  // Arm once the intro hands off (never under reduced motion — no intro there).
  useEffect(() => {
    if (introDone && !reduced && !played.current) {
      played.current = true;
      setActive(true);
    }
  }, [introDone, reduced]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Themed palette (fall back to the brand values if vars can't be read).
    const css = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback;
    const base = token("--color-base", "#0b1510");
    const palette = [
      token("--color-accent", "#d7f24a"),
      token("--color-accent-bright", "#e7fb6d"),
      token("--color-fg", "#e9f1e6"),
      token("--color-lime-soft", "#9ae05a"),
    ];

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pool: Particle[] = Array.from({ length: COUNT }, () => ({
      a0: Math.random() * TAU,
      phase: Math.random(),
      speed: rand(0.35, 0.6),
      turns: rand(0.5, 1.4),
      spin: rand(-TAU, TAU),
      size: rand(4, 16),
      shape: SHAPES[(Math.random() * SHAPES.length) | 0],
      rgb: toRgb(palette[(Math.random() * palette.length) | 0]),
    }));

    let elapsed = 0;
    const tick = () => {
      elapsed += gsap.ticker.deltaRatio(60) / 60; // ~seconds
      const t = elapsed;
      // The vortex is its own opaque "page": the background matches the intro and
      // stays solid, then fades out over the final BG_FADE seconds to reveal the
      // hero beneath. Shapes fade in quickly and fade out with the background.
      const bgAlpha =
        t < DURATION - BG_FADE ? 1 : Math.max(0, (DURATION - t) / BG_FADE);
      const env = gsap.utils.clamp(
        0,
        1,
        Math.min(t / 0.2, (DURATION - t) / BG_FADE),
      );
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.hypot(w, h) * 0.55;

      ctx.clearRect(0, 0, w, h);
      // Opaque intro-coloured page (fades out at the end to reveal the hero).
      ctx.globalAlpha = bgAlpha;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      // Glossy shapes carry their own shading, so they draw with normal
      // (source-over) compositing; the coloured shadow below is their bloom.
      for (const p of pool) {
        const depth = (p.phase + t * p.speed) % 1; // 0 (centre) → 1 (edge)
        const radius = depth * depth * maxR; // accelerate outward
        const ang = p.a0 + depth * p.turns * TAU + t * 0.6;
        const x = cx + Math.cos(ang) * radius;
        const y = cy + Math.sin(ang) * radius;
        const scale = 0.15 + depth * 2.1;
        const alpha = Math.sin(depth * Math.PI) * env;
        if (alpha <= 0.01) continue;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(depth * p.spin);
        const [pr, pg, pb] = p.rgb;
        ctx.shadowColor = `rgb(${pr},${pg},${pb})`;
        ctx.shadowBlur = 10 * scale;
        drawShape(ctx, p.shape, p.size * scale, p.rgb);
        ctx.restore();
      }

      if (t >= DURATION) {
        ctx.clearRect(0, 0, w, h);
        gsap.ticker.remove(tick);
        window.removeEventListener("resize", resize);
        setActive(false);
      }
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  // Bold "caught in the vortex" swirl. The whole page is wound up (rotated + zoomed
  // + blurred) behind the opaque vortex page, then spun down with INCREASING speed
  // as the hero is revealed — three turns in all: two accelerating in, then a final
  // turn easing to a complete stop. It deliberately runs on PAST the vortex clear,
  // so several of those turns land on the fully-revealed hero page. Driven on
  // #smooth-wrapper (the outer, viewport-sized frame): ScrollSmoother owns
  // #smooth-content's transform and would fight ours.
  //
  // Started once (ref-guarded) and NOT torn down when `active` flips false at the
  // vortex end — the timeline owns its own life and clears its props on finish, so
  // the spin can outlive the vortex. Only armed while the vortex plays, so it still
  // inherits the reduced-motion gate. Killed only on a real unmount (below).
  useEffect(() => {
    if (!active || swirled.current) return;
    swirled.current = true;
    const wrapper = document.querySelector<HTMLElement>("#smooth-wrapper");
    if (!wrapper) return;

    // Evan's portrait at the hero is the FIXED clone (#scroll-portrait, z-40) that
    // ScrollPortrait reveals — it lives OUTSIDE #smooth-wrapper, so the wrapper's
    // spin can't reach it. Spin it in lockstep so the portrait swirls with the page.
    // Both rotate about the viewport centre: the wrapper's top-left IS the viewport
    // top-left (a px origin), while the fixed clone is left/top:50%, so its own
    // top-left already sits at the viewport centre (origin "0 0"). The clone's own
    // ScrollTrigger transforms live on its child stage, so this wrapper-level spin
    // composes cleanly on top.
    const portrait = document.getElementById("scroll-portrait");
    const targets: HTMLElement[] = portrait ? [wrapper, portrait] : [wrapper];
    gsap.set(wrapper, {
      transformOrigin: `${window.innerWidth / 2}px ${window.innerHeight / 2}px`,
    });
    if (portrait) gsap.set(portrait, { transformOrigin: "0px 0px" });

    const reveal = DURATION - BG_FADE; // when the hero starts showing through

    const tl = gsap.timeline();
    swirlTl.current = tl;
    tl
      // Three turns wound up, held under the opaque page until the reveal.
      .set(targets, { rotation: -1080, scale: 1.4, filter: "blur(12px)" })
      // Increasing speed: two turns accelerating in as the hero appears...
      .to(
        targets,
        {
          rotation: -360,
          scale: 1.08,
          filter: "blur(5px)",
          duration: 1.2,
          ease: "power2.in",
        },
        reveal - 0.1,
      )
      // ...then the last turn eases to a complete stop, out on the revealed hero.
      .to(targets, {
        rotation: 0,
        scale: 1,
        filter: "blur(0px)",
        duration: 0.7,
        ease: "power2.out",
        clearProps: "transform,filter,transformOrigin",
      });
  }, [active]);

  // Kill the swirl only on a real unmount (it is intentionally not tied to the
  // vortex's `active` lifecycle, so it can finish spinning on the revealed hero).
  useEffect(
    () => () => {
      swirlTl.current?.kill();
      const clear = "transform,filter,transformOrigin";
      const wrapper = document.querySelector<HTMLElement>("#smooth-wrapper");
      if (wrapper) gsap.set(wrapper, { clearProps: clear });
      const portrait = document.getElementById("scroll-portrait");
      if (portrait) gsap.set(portrait, { clearProps: clear });
    },
    [],
  );

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[95]"
    />
  );
}
