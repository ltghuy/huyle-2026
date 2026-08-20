import { experience } from "@/content/experience";
import { Reveal } from "@/components/motion/Reveal";
import { LineReveal } from "@/components/motion/LineReveal";
import { SerpentineTimeline } from "./SerpentineTimeline.client";

export function Experience() {
  return (
    <section id="experience" className="px-6 py-28 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <Reveal>
            <p className="eyebrow mb-3">Career</p>
          </Reveal>
          <LineReveal
            as="h2"
            className="display text-4xl text-fg sm:text-6xl"
          >
            Career &amp; <span className="text-accent">Experience</span>
          </LineReveal>
          <LineReveal
            className="mx-auto mt-6 max-w-2xl text-[1rem] leading-relaxed text-fg-muted sm:text-lg"
            delay={0.15}
          >
            Nearly four years shipping production frontend across clinical,
            legal, and enterprise domains.
          </LineReveal>
        </div>

        <SerpentineTimeline items={experience} />
      </div>
    </section>
  );
}
