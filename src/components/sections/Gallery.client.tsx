"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useWebGLAvailable } from "@/lib/useWebGLAvailable";
import { useInViewport } from "@/lib/useInViewport";
import { Reveal } from "@/components/motion/Reveal";
import { galleryImages } from "@/content/gallery";

/**
 * "Off the clock" — a full-bleed WebGL photo GLOBE. The photos are spread over
 * a sphere as rounded tiles, floating above a green perspective floor grid;
 * grab and drag to spin the globe on both axes (it coasts to a stop, then idles
 * with a slow drift), and hovering a tile runs a water-ripple through it. An
 * editorial overlay names the hovered photo (index + caption) and hints the
 * drag affordance, echoing the hero's mono "runner" marks.
 *
 * The live scene is client-only (ssr:false) and only mounts when WebGL and
 * motion are both available. Otherwise — reduced motion, no WebGL, or no JS —
 * it degrades to a native horizontal scroll-snap row of the same photos.
 */

/** Double-headed horizontal arrow — the drag affordance cue (SVG, not emoji). */
function DragCue() {
  return (
    <svg
      width="22"
      height="12"
      viewBox="0 0 24 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 3 L2.5 7 L7 11" />
      <path d="M17 3 L21.5 7 L17 11" />
      <path d="M2.5 7 H21.5" />
    </svg>
  );
}

const SceneLoader = () => (
  <div className="grid h-full w-full place-items-center" aria-hidden>
    <div className="size-9 animate-spin rounded-full border-2 border-line border-t-accent" />
  </div>
);

// Next 16 forbids ssr:false in Server Components, so the dynamic import lives
// here in this Client Component (the same pattern as the 3D hero).
const GalleryScene = dynamic(
  () => import("./GalleryScene.client").then((m) => m.GalleryScene),
  { ssr: false, loading: () => <SceneLoader /> },
);

/** No-JS / reduced-motion / no-WebGL fallback: a native scroll-snap row. */
function ScrollRow() {
  return (
    <ul className="mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:thin] sm:px-12 lg:px-20">
      {galleryImages.map((img) => (
        <li
          key={img.src}
          className="relative aspect-[3/2] w-72 shrink-0 snap-center overflow-hidden rounded-2xl border border-accent/15 shadow-lg sm:w-96"
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes="(max-width:640px) 18rem, 24rem"
            className="object-cover [object-position:50%_28%]"
          />
        </li>
      ))}
    </ul>
  );
}

export function Gallery() {
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGLAvailable();
  const live = webgl && !reduced;

  // Only run the WebGL render loop while the globe is on (or near) screen — it
  // wakes ~300px before entering view so there's no blank first frame.
  const [stageRef, inView] = useInViewport<HTMLDivElement>("300px 0px");

  // Front-most photo, reported by the WebGL scene as the wall spins.
  const [active, setActive] = useState(0);
  const activeImage = galleryImages[active] ?? galleryImages[0];
  const total = String(galleryImages.length).padStart(2, "0");

  return (
    <section id="gallery" className="relative overflow-hidden py-28">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-12 lg:px-20">
        <Reveal className="text-center">
          <p className="eyebrow mb-3">Gallery</p>
          <h2 className="display text-4xl text-fg sm:text-6xl">Off the clock</h2>
          <p className="mx-auto mt-4 max-w-md text-fg-muted">
            A few frames from life away from the keyboard — gym, coffee, and a
            cat who runs the place.
          </p>
        </Reveal>
      </div>

      {live ? (
        <div
          ref={stageRef}
          className="relative mt-12 h-[70vh] min-h-[26rem] w-full cursor-grab touch-pan-y select-none active:cursor-grabbing sm:h-[80vh] lg:h-[88vh]"
        >
          <GalleryScene onActive={setActive} active={inView} />

          {/* Editorial overlay — index + caption (left) and drag cue (right),
              pinned to the band's lower edge. pointer-events-none so it never
              swallows the drag gesture on the canvas beneath. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-6 px-7 pb-12 sm:px-12 sm:pb-10 lg:px-20">
            <div>
              <span className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-accent">
                {String(active + 1).padStart(2, "0")}
                <span className="text-fg-subtle"> / {total}</span>
              </span>
              <p className="mt-2.5 max-w-xs font-mono text-sm leading-relaxed text-fg-muted">
                {activeImage.alt}
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.18em] text-fg-subtle">
              <DragCue />
              <span className="hidden sm:inline">Drag to explore</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <ScrollRow />
        </div>
      )}
    </section>
  );
}
