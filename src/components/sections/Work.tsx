"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import { PROJECT_SLOTS, type Project } from "@/content/projects";
import { GithubIcon } from "@/components/icons/BrandIcons";
import { Reveal } from "@/components/motion/Reveal";
import { useLocale } from "@/lib/i18n/LocaleProvider.client";
import { useContent } from "@/lib/i18n/useContent.client";

/**
 * Projects — a 2 × 2 grid of cards (one column below md). Real projects fill
 * the first slots; any left over render as dashed "coming soon" placeholders,
 * so adding a project to `src/content/projects.ts` replaces the next one.
 */

const formatIndex = (n: number) => String(n).padStart(2, "0");

function ProjectCard({ project }: { project: Project }) {
  const { t } = useLocale();
  return (
    <article className="group relative flex min-h-[24rem] flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl transition-colors duration-300 focus-within:border-accent/40 hover:border-accent/40 sm:p-8">
      {/* Ambient accent glow — depth, not a flat panel. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h3 className="display text-3xl leading-[0.95] text-fg sm:text-4xl">
            {project.name}
          </h3>
          <p className="mt-3 font-mono text-xs text-fg-subtle">{project.role}</p>
        </div>
        <span className="display shrink-0 text-5xl leading-none text-accent">
          {formatIndex(project.index)}
        </span>
      </div>

      <div className="relative mt-6 pb-8">
        <p className="text-lg font-medium leading-snug text-fg">
          {project.oneLiner}
        </p>
        {/* NB: avoid Tailwind's `text-base` — the project defines a `--color-base`
            token, so `text-base` resolves to color:var(--color-base) and paints
            the text invisible. Always set an explicit size here. */}
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          {project.description}
        </p>

        {(project.links.demo || project.links.source) && (
          <div className="mt-5 flex flex-wrap gap-5">
            {project.links.demo && (
              <a
                href={project.links.demo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-fg"
              >
                {t.work.liveDemo}
                <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            )}
            {project.links.source && (
              <a
                href={project.links.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-fg transition-colors hover:text-accent"
              >
                <GithubIcon className="size-4" /> {t.work.source}
              </a>
            )}
          </div>
        )}
      </div>

      <ul className="relative mt-auto flex flex-wrap gap-2 border-t border-line pt-5">
        {project.tech.map((tech) => (
          <li
            key={tech}
            className="rounded-full border border-line px-3 py-1 font-mono text-xs text-fg-muted"
          >
            {tech}
          </li>
        ))}
      </ul>
    </article>
  );
}

function PlaceholderCard({ index }: { index: number }) {
  const { t } = useLocale();
  return (
    <article className="flex min-h-[14rem] flex-col justify-between rounded-3xl border border-dashed md:min-h-[24rem] border-line p-6 sm:p-8">
      <span className="display text-5xl leading-none text-fg-subtle">
        {formatIndex(index)}
      </span>
      <div>
        <Plus aria-hidden className="mb-4 size-6 text-fg-subtle" />
        <h3 className="display text-3xl leading-[0.95] text-fg-muted sm:text-4xl">
          {t.work.comingSoon}
        </h3>
        <p className="mt-3 text-sm text-fg-subtle">{t.work.placeholderBody}</p>
      </div>
    </article>
  );
}

export function Work() {
  const { t } = useLocale();
  const { projects } = useContent();
  const shown = projects.slice(0, PROJECT_SLOTS);
  const placeholders = Array.from(
    { length: PROJECT_SLOTS - shown.length },
    (_, i) => shown.length + i + 1,
  );

  return (
    <section id="work" className="px-6 py-28 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="eyebrow mb-3">{t.work.eyebrow}</p>
          <h2 className="display text-4xl text-fg sm:text-6xl">
            {t.work.heading}
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {shown.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          {placeholders.map((index) => (
            <PlaceholderCard key={index} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
