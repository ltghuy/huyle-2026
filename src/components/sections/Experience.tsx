import { experience, type ExperienceItem } from "@/content/experience";
import { Reveal } from "@/components/motion/Reveal";
import { LineReveal } from "@/components/motion/LineReveal";
import { AnimatedTimeline } from "./AnimatedTimeline";

/** Split "Nov 2025 – Present" into ["Nov 2025", "– Present"] for the stacked big date. */
function splitPeriod(period: string): [string, string] {
  const parts = period.split("–");
  if (parts.length === 2) return [parts[0].trim(), `– ${parts[1].trim()}`];
  return [period, ""];
}

function BigDate({ item }: { item: ExperienceItem }) {
  const [start, end] = splitPeriod(item.period);
  return (
    <div className="md:text-right">
      <p className="font-display text-3xl font-light leading-[1.05] text-fg-muted sm:text-4xl">
        <span className="block">{start}</span>
        {end && <span className="block">{end}</span>}
      </p>
      {item.current && (
        <span className="mt-2 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-accent">
          Now
        </span>
      )}
    </div>
  );
}

function RoleCompany({ item }: { item: ExperienceItem }) {
  return (
    <div>
      <h3 className="text-xl font-bold leading-tight text-fg sm:text-2xl">
        {item.role}
      </h3>
      <p className="mt-1.5 text-accent">{item.company}</p>
    </div>
  );
}

function Details({ item }: { item: ExperienceItem }) {
  return (
    <div>
      <p className="text-sm text-fg-subtle">{item.context}</p>
      <ul className="mt-4 space-y-2">
        {item.highlights.map((h, idx) => (
          <li key={idx} className="flex gap-3 text-sm text-fg-muted">
            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent/60" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-2">
        {item.tech.map((t) => (
          <li
            key={t}
            className="rounded-md border border-line px-2 py-0.5 font-mono text-[0.7rem] text-fg-subtle"
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

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
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg"
            delay={0.15}
          >
            Nearly four years shipping production frontend across clinical,
            legal, and enterprise domains.
          </LineReveal>
        </div>

        <AnimatedTimeline>
          {experience.map((item) => (
            <Reveal key={`${item.company}-${item.period}`} className="relative">
              {/* Desktop: role|date on the left of the line, details on the right */}
              <div className="grid gap-6 md:grid-cols-2 md:gap-0">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8 md:pr-14">
                  <div className="order-2 md:order-1">
                    <RoleCompany item={item} />
                  </div>
                  <div className="order-1 md:order-2">
                    <BigDate item={item} />
                  </div>
                </div>
                <div className="md:pl-14">
                  <Details item={item} />
                </div>
              </div>
            </Reveal>
          ))}
        </AnimatedTimeline>
      </div>
    </section>
  );
}
