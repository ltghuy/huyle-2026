"use client";

import Image from "next/image";
import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import {
  ABOUT_CHAPTERS,
  ChapterBlock,
  NAME_LEFT,
  NAME_RIGHT,
} from "@/components/sections/AboutCopy";

/**
 * Scroll Zoom Portal (à la the majd reference + gsapvault.com/effects/scroll-zoom-portal).
 *
 * The ENTIRE portal lives in one fixed layer (this component, rendered outside
 * #smooth-content in the root layout) so it stays viewport-locked and forms a
 * single stacking context — no pinning, and nothing the next section can overlap.
 *
 *  1. ENTRANCE (hero → #about top): a clone of the hero portrait flies from its
 *     hero spot to centre-stage — rising, scaling up, a slight tilt straightening,
 *     B&W → colour — while "HUY" / "LE" and the "About" chip fade in to flank it.
 *
 *  2. PORTAL + HIJACK (scrubbed over #about's height): the portrait SPLITS
 *     vertically down the middle and the two halves travel outward — the left half
 *     with "HUY", the right half with "LE" — opening the stage. Then the About bio
 *     plays as a run of scroll-hijack chapters: each holds pinned-in-place while
 *     its words reveal one by one (rise + de-blur), beats, then releases to the
 *     next. The last chapter clears before #about ends, so the Gallery arrives clean.
 *
 * `#about` itself is the scroll track + the no-JS / reduced-motion fallback (see
 * About.tsx). Here we set it tall and hide its fallback (kept for a11y/SEO). Under
 * reduced motion this effect no-ops and #about's own static layout shows.
 */

const DOCK_SCALE = 1.7; // docked size, relative to the hero portrait size
const START_TILT = -6; // deg — a slight 2D tilt at the hero, straightening as it docks
// #about scroll length driving the whole scrub: the split intro + one beat per
// bio chapter. The taller this track, the more you scroll per beat — so raising
// it slows the whole portal effect down (more scroll distance per animation).
const TRACK_HEIGHT = "780vh";

const WORD_CLASS =
  "display absolute top-1/2 text-fg text-[clamp(2.5rem,11vw,9rem)] leading-none will-change-transform";

/**
 * Group a chapter's [data-word] spans by the line they actually render on
 * (à la the gsapvault "Scroll Hijack Sections" effect), so the reveal staggers
 * per line at any viewport width. Words are in DOM order, so offsetTop only ever
 * jumps forward at a line break.
 */
function lineGroups(panel: HTMLElement): HTMLElement[][] {
  const words = Array.from(panel.querySelectorAll<HTMLElement>("[data-word]"));
  const groups: HTMLElement[][] = [];
  let lineTop = -Infinity;
  // Threshold sits between the baseline offset a scaled-up accent word adds
  // (~10px) and the gap to the next line (~40px+), so a bigger word stays on its
  // own line's group instead of splitting off.
  for (const w of words) {
    const top = w.offsetTop;
    if (groups.length === 0 || top - lineTop > 20) {
      groups.push([]);
      lineTop = top;
    }
    groups[groups.length - 1].push(w);
  }
  return groups;
}

/**
 * The portrait — a single image filling the card (no split). Grayscale (--pg,
 * set on the stage during the entrance) resolves to colour as it docks; the
 * zoom-through portal then scales the whole card as one and dissolves it.
 */
function Portrait() {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-2xl"
      style={{ filter: "grayscale(var(--pg, 1))" }}
    >
      <Image
        src="/assets/evan.png"
        alt=""
        fill
        sizes="(max-width: 640px) 60vw, 420px"
        className="object-cover"
      />
    </div>
  );
}

export function ScrollPortrait() {
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;

    // Build only once the web fonts have settled: per-line grouping reads each
    // word's rendered line via offsetTop, and fallback-font metrics wrap text
    // differently — building too early splits a line's words across beats.
    const setup = () => {
      if (cancelled) return;
    const source = document.querySelector<HTMLElement>("[data-hero-portrait]");
    const heroEl = document.getElementById("hero");
    const aboutEl = document.getElementById("about");
    const wrapper = document.getElementById("scroll-portrait");
    const stage = document.getElementById("scroll-portrait-stage");
    const card = document.getElementById("scroll-portrait-card");
    const frame = document.querySelector<HTMLElement>("[data-pp-frame]");
    const bloom = document.querySelector<HTMLElement>("[data-pp-bloom]");
    const leftWord = document.querySelector<HTMLElement>("[data-pp-left]");
    const rightWord = document.querySelector<HTMLElement>("[data-pp-right]");
    const chip = document.querySelector<HTMLElement>("[data-pp-chip]");
    const chaptersWrap = document.querySelector<HTMLElement>("[data-pp-chapters]");
    const chapters = Array.from(
      document.querySelectorAll<HTMLElement>("[data-pp-chapter]"),
    );
    if (!source || !heroEl || !aboutEl || !wrapper || !stage || !card) return;

    const fallback = aboutEl.querySelector<HTMLElement>("[data-about-fallback]");

    gsap.registerPlugin(ScrollTrigger);

    // Make #about the scroll track and hand its content to this layer: hide the
    // hero portrait + the static fallback (kept in the a11y tree via opacity),
    // set #about tall, and reveal this fixed layer.
    const prevMinH = aboutEl.style.minHeight;
    aboutEl.style.minHeight = TRACK_HEIGHT;
    source.style.visibility = "hidden";
    if (fallback) {
      fallback.style.opacity = "0";
      fallback.style.pointerEvents = "none";
    }
    wrapper.style.visibility = "visible";

    // Size the clone to the hero portrait; derive its starting vertical offset
    // (hero-spot centre → viewport centre). Recomputed on every refresh.
    const measure = () => {
      const r = source.getBoundingClientRect();
      stage.style.width = `${r.width}px`;
      // Docked card width — the name flanks this (see --dock-w in the markup).
      wrapper.style.setProperty("--dock-w", `${r.width * DOCK_SCALE}px`);
      const docCenterY = r.top + window.scrollY + r.height / 2;
      return docCenterY - window.innerHeight / 2;
    };
    let startY = measure();
    const onRefreshInit = () => {
      startY = measure();
    };
    ScrollTrigger.addEventListener("refreshInit", onRefreshInit);

    let portalProgress = 0;

    // Velocity "flick lean": fast scrolling skews the bio block (motion blur);
    // a power3 tween continuously eases the skew back to rest, so it settles the
    // moment scrolling stops and is only overridden by a faster flick.
    const skewTo = chaptersWrap
      ? gsap.quickTo(chaptersWrap, "skewY", { duration: 0.6, ease: "power3.out" })
      : null;

    const ctx = gsap.context(() => {
      gsap.set(stage, { xPercent: -50, yPercent: -50, transformOrigin: "50% 50%" });
      // Name parts start blurred + offset — they focus in (de-blur) on entrance.
      if (leftWord) gsap.set(leftWord, { yPercent: -50, autoAlpha: 0, filter: "blur(18px)" });
      if (rightWord) gsap.set(rightWord, { yPercent: -50, autoAlpha: 0, filter: "blur(18px)" });
      if (chip) gsap.set(chip, { xPercent: -50, autoAlpha: 0 });
      // Bloom centres itself via GSAP (not a CSS transform) so its scale-up
      // composes cleanly with the centring.
      if (bloom)
        gsap.set(bloom, { xPercent: -50, yPercent: -50, scale: 0.6, autoAlpha: 0 });
      chapters.forEach((c) => gsap.set(c, { autoAlpha: 0 }));

      // Gate the whole fixed layer to its own range (hero entrance → end of
      // #about). Two scrubbed timelines drive the name's opacity, and past
      // #about the entrance's "docked/visible" value can win — or an instant nav
      // jump can land there mid-scrub — leaving HUY/LE bleeding over Work /
      // Contact. Hiding the wrapper outside the range guarantees a clean exit.
      // The layer is relevant from the hero (entrance) through the end of
      // #about; only PAST #about must it hide (so HUY/LE can't bleed over Work /
      // Contact). Gate on the #about END alone: onLeave hides, onEnterBack (or
      // being anywhere above the end) shows. The hero has nothing above it, so no
      // top boundary is needed — which also avoids the scroll-0 re-activation
      // glitch that a hero-anchored toggle hits when you jump back home.
      ScrollTrigger.create({
        trigger: aboutEl,
        start: "top top",
        end: "bottom bottom",
        onLeave: () => gsap.set(wrapper, { autoAlpha: 0 }),
        onEnterBack: () => gsap.set(wrapper, { autoAlpha: 1 }),
      });
      // Initial state: hidden only if we load already past #about's end.
      const aboutBottom = aboutEl.offsetTop + aboutEl.offsetHeight;
      gsap.set(wrapper, {
        autoAlpha: window.scrollY >= aboutBottom - window.innerHeight ? 0 : 1,
      });

      // ── Phase 1 · ENTRANCE (hero top → #about top) ────────────────────────
      const entrance = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: heroEl,
          start: "top top",
          endTrigger: aboutEl,
          end: "top top",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });
      entrance.fromTo(
        stage,
        { y: () => startY, scale: 1, rotation: START_TILT, "--pg": 1 },
        { y: 0, scale: DOCK_SCALE, rotation: 0, "--pg": 0, duration: 1 },
        0,
      );
      // NOTE: the name + chip lifecycle lives ENTIRELY in the portal timeline
      // (below), not here — so a single timeline owns their opacity. If the
      // entrance also faded them in, scrubbing back to the top (e.g. clicking the
      // logo → #hero) would render the portal's captured "visible" start-state
      // over the hero, leaving HUY/LE overlapping the hero heading.

      // ── Phase 2 · PORTAL (scrubbed over #about's height) ──────────────────
      // 0.00–0.30  portrait splits + halves travel out · name parts · chip drifts
      // 0.32–0.94  bio chapters, one hijack beat each (reveal · hold · release)
      // 0.94–1.00  cleared, so the Gallery arrives with nothing overlapping
      const CH_START = 0.34; // scroll fraction where the bio chapters begin
      const CH_STEP = 0.155; // scroll fraction per chapter (reveal + hold + release)
      const portal = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: aboutEl,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            portalProgress = self.progress;
            // Lean only while the bio chapters are on stage; clamp so a hard
            // flick tilts a few degrees at most.
            if (skewTo && self.progress > CH_START - 0.04) {
              skewTo(gsap.utils.clamp(-7, 7, self.getVelocity() / -320));
            }
          },
        },
      });

      // `to` (not fromTo) so start values are captured live from the entrance's
      // end state — fromTo's immediateRender would clobber the hero pose.

      // Name + chip FOCUS IN at the very start of the portal (blur → sharp), so
      // at portal progress 0 (i.e. anywhere in the hero region) they read as
      // hidden — no HUY/LE bleeding over the hero.
      if (leftWord)
        portal.to(leftWord, { autoAlpha: 1, filter: "blur(0px)", duration: 0.05 }, 0);
      if (rightWord)
        portal.to(rightWord, { autoAlpha: 1, filter: "blur(0px)", duration: 0.05 }, 0);
      if (chip) portal.to(chip, { autoAlpha: 1, duration: 0.05 }, 0);

      // ZOOM-THROUGH: the docked portrait rushes toward the viewer (scaling well
      // past the viewport) and softens (blur), while a lime bloom flares from its
      // centre and the card fades — so it reads as passing THROUGH the portrait
      // into light, not a card shrinking away.
      portal.to(
        stage,
        { scale: DOCK_SCALE * 3.2, filter: "blur(14px)", duration: 0.3, ease: "power2.in" },
        0.04,
      );
      // Hold opacity while it grows, then dissolve in the back half of the zoom.
      portal.to(stage, { autoAlpha: 0, duration: 0.16 }, 0.18);
      // The card outline fades early so no hard border rides the zoom.
      if (frame) portal.to(frame, { autoAlpha: 0, duration: 0.08 }, 0.05);
      // Lime bloom: flares up as the portrait engulfs the frame, then clears.
      if (bloom) {
        portal.to(bloom, { autoAlpha: 0.95, scale: 1.5, duration: 0.16 }, 0.08);
        portal.to(bloom, { autoAlpha: 0, scale: 2.4, duration: 0.16 }, 0.24);
      }

      // Name parts outward with rising letter-spacing + blur, tracking each half.
      if (leftWord)
        portal.to(
          leftWord,
          { xPercent: -155, autoAlpha: 0, filter: "blur(12px)", letterSpacing: "0.2em", duration: 0.24 },
          0.06,
        );
      if (rightWord)
        portal.to(
          rightWord,
          { xPercent: 155, autoAlpha: 0, filter: "blur(12px)", letterSpacing: "0.2em", duration: 0.24 },
          0.06,
        );
      if (chip)
        portal.to(chip, { yPercent: -140, autoAlpha: 0, duration: 0.18 }, 0.06);

      // Scroll-hijack chapters (à la gsapvault "Scroll Hijack Sections"): each
      // holds the stage while its text assembles LINE BY LINE — words on a line
      // rise + de-blur together, lines cascade — then a HOLD keeps the finished
      // statement still before it releases to the next. Timeline fractions are
      // scrubbed to #about's height, so each beat consumes ~a viewport.
      const REVEAL = CH_STEP * 0.5; // scroll fraction spent assembling a chapter
      chapters.forEach((panel, i) => {
        const s = CH_START + i * CH_STEP;
        const lines = lineGroups(panel);
        const lineStep = (REVEAL * 0.82) / Math.max(lines.length, 1);
        portal.to(panel, { autoAlpha: 1, duration: 0.02 }, s);
        lines.forEach((line, li) => {
          portal.from(
            line,
            {
              autoAlpha: 0,
              yPercent: 120,
              filter: "blur(10px)",
              duration: REVEAL * 0.55,
              // A whisper of intra-line stagger for texture; the line reads as one.
              stagger: { each: (lineStep * 0.35) / line.length, from: "start" },
            },
            s + li * lineStep,
          );
        });
        // HOLD (data-hold analogue): the completed statement sits still, then the
        // chapter releases before the next begins (and, for the last, before
        // #about ends so the Gallery arrives clean).
        portal.to(panel, { autoAlpha: 0, duration: 0.03 }, s + CH_STEP * 0.86);
      });
    });

    // Magnetic hover on the docked portrait, disabled once the portal begins.
    const MAG_STRENGTH = 0.22;
    const xTo = gsap.quickTo(card, "x", { duration: 0.5, ease: "elastic.out(1,0.4)" });
    const yTo = gsap.quickTo(card, "y", { duration: 0.5, ease: "elastic.out(1,0.4)" });
    const onMagMove = (e: MouseEvent) => {
      if (portalProgress > 0.02) return;
      const r = card.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * MAG_STRENGTH);
      yTo((e.clientY - r.top - r.height / 2) * MAG_STRENGTH);
    };
    const onMagLeave = () => {
      if (portalProgress > 0.02) return;
      xTo(0);
      yTo(0);
    };
    card.addEventListener("mousemove", onMagMove);
    card.addEventListener("mouseleave", onMagLeave);

      teardown = () => {
        ctx.revert();
        ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
        card.removeEventListener("mousemove", onMagMove);
        card.removeEventListener("mouseleave", onMagLeave);
        gsap.set(card, { clearProps: "x,y" });
        if (chaptersWrap) gsap.set(chaptersWrap, { clearProps: "skewY" });
        aboutEl.style.minHeight = prevMinH;
        source.style.visibility = "";
        if (fallback) {
          fallback.style.opacity = "";
          fallback.style.pointerEvents = "";
        }
        wrapper.style.visibility = "hidden";
      };
    };

    const fontsReady = document.fonts?.ready;
    if (fontsReady) fontsReady.then(setup);
    else setup();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [reduced]);

  return (
    <div
      id="scroll-portrait"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      style={{ visibility: "hidden" } as React.CSSProperties}
    >
      {/* "About" chip */}
      <p data-pp-chip className="eyebrow absolute left-1/2 top-24 sm:top-28">
        About
      </p>

      {/* Name — flanks the portrait (using the measured --dock-w), parts outward */}
      <span
        data-pp-left
        className={`${WORD_CLASS} right-[calc(50%+var(--dock-w,190px)/2-1rem)] pr-2 text-right`}
      >
        {NAME_LEFT}
      </span>
      <span
        data-pp-right
        className={`${WORD_CLASS} left-[calc(50%+var(--dock-w,190px)/2-1rem)] pl-2 text-left`}
      >
        {NAME_RIGHT}
      </span>

      {/* Lime bloom — a soft radial glow that flares from the portrait's centre
          as it zooms through and dissolves, so the dissolve reads as light, not
          a vanishing card. GSAP centres + scales it (no CSS transform here). */}
      <div
        data-pp-bloom
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[62vmin] w-[62vmin] rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(circle, rgba(215,242,74,0.5) 0%, rgba(215,242,74,0.14) 42%, transparent 70%)",
          filter: "blur(24px)",
        }}
      />

      {/* Portrait clone — flies in, docks, then scales up and dissolves through
          the viewer (the zoom-through portal). The two halves scale as one card. */}
      <div id="scroll-portrait-stage" className="absolute left-1/2 top-1/2">
        <div
          id="scroll-portrait-card"
          className="pointer-events-auto relative aspect-[700/959] w-full shadow-lg"
        >
          <Portrait />

          {/* Card outline — reads as one rounded card, fades as it zooms away */}
          <div
            data-pp-frame
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl border border-accent/15"
            style={{ boxShadow: "inset 0 0 0 1px rgba(215, 242, 74, 0.10)" }}
          />
        </div>
      </div>

      {/* Bio chapters — stacked, one shown at a time as scroll-hijack beats.
          The wrapper carries the velocity "flick lean" (skew driven by scroll
          speed, eased back to rest). */}
      <div
        data-pp-chapters
        className="absolute inset-0"
        style={{ willChange: "transform" }}
      >
        {ABOUT_CHAPTERS.map((chapter, i) => (
          <div
            key={i}
            data-pp-chapter
            className="absolute inset-0 flex items-center justify-center px-6 sm:px-12 lg:px-20"
          >
            <div className="w-full max-w-4xl">
              <ChapterBlock
                chapter={chapter}
                bodyClassName="text-3xl leading-snug text-fg sm:text-5xl sm:leading-[1.15]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
