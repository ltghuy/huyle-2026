import { Reveal } from "@/components/motion/Reveal";

/**
 * A single quiet, centered "breath" beat between the hero and the capabilities
 * (feature 002 — editorial re-style). One line about what Huy does, surrounded
 * by generous negative space, mirroring the reference's mission-statement moment.
 */
export function Statement() {
  return (
    <section
      id="statement"
      className="relative px-6 py-32 sm:px-12 sm:py-40 lg:px-20"
    >
      <Reveal className="mx-auto max-w-4xl text-center">
        <p className="display text-2xl leading-tight text-fg sm:text-4xl">
          I build production web platforms that stay{" "}
          <span className="text-accent">fast, accessible, and considered</span> —
          from product spec to production observability, with AI woven in where it
          earns its place.
        </p>
      </Reveal>
    </section>
  );
}
