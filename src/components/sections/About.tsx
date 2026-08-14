import { Reveal } from "@/components/motion/Reveal";

export function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden px-6 py-28 sm:px-12 lg:px-20"
    >
      {/* Bio only — the interactive 3D scene now lives in the Hero (feature 002),
          so the character overlaps the oversized name rather than sitting beside
          the bio. */}
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="eyebrow mb-3">About</p>
          <h2 className="display text-4xl text-fg sm:text-6xl">The Person</h2>
        </Reveal>

        <Reveal className="mt-8 space-y-5 text-lg leading-relaxed text-fg-muted">
          <p>
            I&apos;m Huy — born and raised in Vietnam, now building software in
            Ho Chi Minh City. Over the last 4+ years I&apos;ve
            shipped production web platforms across healthcare, legal-tech, and
            enterprise-event domains, most recently leading frontend on
            AI-native healthcare products at Naver.
          </p>
          <p>
            I care about the craft: scalable architecture, design systems that
            teams actually adopt, and interfaces that feel considered down to the
            motion. This site is a little proof of that.
          </p>
          <p>
            Off the clock you&apos;ll find me with anime, music, and my tuxedo cat{" "}
            <span className="text-accent">Bông</span> — who, if you look closely,
            may have wandered into this page too. 🐱
          </p>
        </Reveal>
      </div>
    </section>
  );
}
