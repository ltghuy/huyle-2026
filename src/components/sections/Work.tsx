"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ExternalLink } from "lucide-react";
import { projects, type Project } from "@/content/projects";
import { GithubIcon } from "@/components/icons/BrandIcons";
import { Reveal } from "@/components/motion/Reveal";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

/**
 * Projects — a Scroll Stack Cards deck (à la
 * https://gsapvault.com/effects/scroll-stack-cards).
 *
 * The section pins and a single scrubbed timeline drives the deck: each project
 * card rides up from below the frame to its resting line, and the cards already
 * parked slide back a notch — scaling down, dimming, and peeking at the top — so
 * the stack reads as a depth-sorted deck rather than plain vertical scrolling.
 * "One unit of timeline per arriving card." Cards are anchored to the frame bottom
 * and scale from their top edge, so parked cards shrink downward and their headers
 * (name + number) stay visible in the peek.
 *
 * Under reduced motion / no JS it renders the same cards as a plain vertical stack.
 */
const SCALE_STEP = 0.05; // scale removed per depth level
const PEEK = 18; // px a parked card rises per depth level (top peek)
const DIM_STEP = 0.14; // dim overlay opacity added per depth level
const DIM_CAP = 0.55; // never darken a parked card beyond this

function ProjectCard({
  project,
  stacked = false,
}: {
  project: Project;
  stacked?: boolean;
}) {
  return (
    <article
      data-stack-card
      className={`${stacked ? "absolute inset-x-0 bottom-0 top-14 sm:top-20" : "relative"} flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-2xl sm:p-10 lg:p-14`}
    >
      {/* Ambient accent glow behind the index — adds depth, avoids a flat panel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative z-10 flex h-full flex-col">
        {/* Header: name (left) balanced by the big index (right). */}
        <div className="flex items-start justify-between gap-6">
          <h3 className="display max-w-[16ch] text-4xl leading-[0.95] text-fg sm:text-6xl">
            {project.name}
          </h3>
          <span className="display shrink-0 text-5xl leading-none text-accent sm:text-8xl">
            {String(project.index).padStart(2, "0")}
          </span>
        </div>

        {/* The statement + supporting detail, held to a readable measure. */}
        <div className="mt-6 max-w-3xl sm:mt-10">
          <p className="text-lg font-medium leading-snug text-fg sm:text-3xl sm:leading-snug">
            {project.oneLiner}
          </p>
          {/* NB: avoid `text-base` here — the project defines a `--color-base`
              token, so Tailwind's `text-base` resolves to color:var(--color-base)
              (the page bg) and paints the text invisible. Use an explicit size.
              Clamp on mobile so the card fits the viewport; full text from sm up. */}
          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-fg-muted sm:mt-5 sm:line-clamp-none sm:text-[1.0625rem]">
            {project.description}
          </p>

          {(project.links.demo || project.links.source) && (
            <div className="mt-6 flex flex-wrap gap-5">
              {project.links.demo && (
                <a
                  href={project.links.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-fg transition-colors hover:text-accent"
                >
                  <ExternalLink className="size-4" /> Live demo
                </a>
              )}
              {project.links.source && (
                <a
                  href={project.links.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-fg transition-colors hover:text-accent"
                >
                  <GithubIcon className="size-4" /> Source
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer pinned to the bottom: tech (left) balanced by role · period (right). */}
        <div className="mt-auto flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap gap-2">
            {project.tech.map((t) => (
              <li
                key={t}
                className="rounded-full border border-line px-3 py-1 font-mono text-xs text-fg-muted"
              >
                {t}
              </li>
            ))}
          </ul>
          <p className="shrink-0 font-mono text-xs text-fg-muted sm:text-sm">
            {project.role} · {project.period}
          </p>
        </div>
      </div>

      {/* Depth dim — a black scrim over parked cards, opacity GSAP-driven per level. */}
      <div
        data-card-dim
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-black opacity-0"
      />
    </article>
  );
}

export function Work() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const pin = pinRef.current;
    const frame = frameRef.current;
    if (!section || !pin || !frame) return;

    gsap.registerPlugin(ScrollTrigger);

    // Kill any stale/duplicate trigger already pinning this section (React Strict
    // Mode double-invokes effects in dev, and HMR re-runs them — without this, a
    // second pin stacks a nested spacer and pin-spacing collapses to 0, letting the
    // next section overlap).
    ScrollTrigger.getAll().forEach((t) => {
      if (t.trigger === section) t.kill();
    });

    const cards = gsap.utils.toArray<HTMLElement>(
      frame.querySelectorAll("[data-stack-card]"),
    );
    const dims = cards.map((c) => c.querySelector<HTMLElement>("[data-card-dim]"));
    const n = cards.length;
    if (!n) return;

    // Card 0 rests; the others wait just below the frame.
    cards.forEach((c, i) => {
      gsap.set(c, {
        yPercent: i === 0 ? 0 : 120,
        scale: 1,
        transformOrigin: "center top",
      });
      if (dims[i]) gsap.set(dims[i], { opacity: 0 });
    });

    // Build the deck timeline; a tall section (below) supplies the scroll distance
    // and we pin the inner frame with pinSpacing:false — so ScrollTrigger never adds
    // an auto pin-spacer (which was collapsing to 0 and letting the next section
    // overlap). The real section height keeps everything below pushed down.
    const tl = gsap.timeline();

    // One unit of timeline per arriving card. As card k rises to rest, every
    // card already parked drops one level deeper (scale + peek + dim).
    for (let k = 1; k < n; k++) {
      const at = k - 1;
      tl.to(cards[k], { yPercent: 0, ease: "power2.out", duration: 1 }, at);
      for (let j = 0; j < k; j++) {
        const depth = k - j;
        tl.to(
          cards[j],
          {
            scale: 1 - SCALE_STEP * depth,
            y: -PEEK * depth,
            ease: "power2.out",
            duration: 1,
          },
          at,
        );
        if (dims[j]) {
          tl.to(
            dims[j],
            {
              opacity: Math.min(DIM_CAP, DIM_STEP * depth),
              ease: "power2.out",
              duration: 1,
            },
            at,
          );
        }
      }
    }

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom", // pinned for the section's full height (n × 100vh)
      scrub: true,
      pin: pin,
      pinSpacing: false, // the tall section already reserves the scroll distance
      anticipatePin: 1,
      invalidateOnRefresh: true,
      animation: tl,
    });

    return () => {
      st.kill();
      tl.kill();
      cards.forEach((c) => gsap.set(c, { clearProps: "all" }));
      dims.forEach((d) => d && gsap.set(d, { clearProps: "all" }));
    };
  }, [reduced]);

  if (reduced) {
    return (
      <section id="work" className="px-6 py-28 sm:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="eyebrow mb-3">Selected Work</p>
            <h2 className="display text-4xl text-fg sm:text-6xl">Projects</h2>
          </Reveal>
          <div className="mt-12 flex flex-col gap-6">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    // Tall section = the scroll track (one viewport per project). The inner frame is
    // pinned to the viewport while you scroll through it; because the section owns
    // the height, the deck can't overlap the next section.
    <section
      ref={sectionRef}
      id="work"
      className="relative"
      style={{ height: `${projects.length * 100}vh` }}
    >
      <div
        ref={pinRef}
        className="flex h-screen flex-col justify-center overflow-hidden px-6 py-16 sm:px-12 lg:px-20"
      >
        <div className="mx-auto w-full max-w-6xl">
          <Reveal>
            <p className="eyebrow mb-3">Selected Work</p>
            <h2 className="display text-4xl text-fg sm:text-6xl">Projects</h2>
          </Reveal>

          {/* Deck frame — cards ride up from below and stack. */}
          <div
            ref={frameRef}
            className="relative mt-8 h-[min(62vh,40rem)] overflow-hidden sm:mt-12"
          >
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} stacked />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
