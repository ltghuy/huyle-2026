"use client";

import { Reveal } from "@/components/motion/Reveal";
import { LineReveal } from "@/components/motion/LineReveal";
import { SerpentineTimeline } from "./SerpentineTimeline.client";
import { ExperienceGrid } from "./ExperienceGrid.client";
import { useLocale } from "@/lib/i18n/LocaleProvider.client";
import { useContent } from "@/lib/i18n/useContent.client";

export function Experience() {
  const { t, locale } = useLocale();
  const { experience } = useContent();
  return (
    <section
      id="experience"
      className="relative overflow-hidden px-6 py-28 sm:px-12 lg:px-20"
    >
      {/* Ambient WebGL grid floor grounding the section (behind the timeline). */}
      <ExperienceGrid />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="text-center">
          <Reveal>
            <p className="eyebrow mb-3">{t.experience.eyebrow}</p>
          </Reveal>
          {/* LineReveal splits its text into lines on mount, so remount it on a
              locale change to re-split the translated copy. */}
          <LineReveal key={`h-${locale}`} as="h2" className="display text-4xl text-fg sm:text-6xl">
            {t.experience.heading}{" "}
            <span className="text-accent">{t.experience.headingAccent}</span>
          </LineReveal>
          <LineReveal
            key={`s-${locale}`}
            className="mx-auto mt-6 max-w-2xl text-[1rem] leading-relaxed text-fg-muted sm:text-lg"
            delay={0.15}
          >
            {t.experience.subhead}
          </LineReveal>
        </div>

        <SerpentineTimeline key={locale} items={experience} />
      </div>
    </section>
  );
}
