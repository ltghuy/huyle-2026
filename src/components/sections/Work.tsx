"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { type Project } from "@/content/projects";
import { GithubIcon } from "@/components/icons/BrandIcons";
import { Reveal } from "@/components/motion/Reveal";
import { useLocale } from "@/lib/i18n/LocaleProvider.client";
import { useContent } from "@/lib/i18n/useContent.client";

/**
 * Projects — an "expanding spotlight" of full-height panels (à la the classic
 * expanding-panels interaction, re-skinned to the lime-on-dark system).
 *
 * Desktop (lg+): the projects sit side by side as tall columns. The active one
 * (hover or keyboard focus) widens to reveal its full detail while the rest
 * compress to a slim spine showing their index + vertical name — so the row
 * reads as one interactive filmstrip rather than four static cards. Widths are
 * pure CSS `flex-grow` transitions, so there's no pin, no scroll-hijack, and it
 * degrades to instant reveals under `prefers-reduced-motion`.
 *
 * Below lg the columns can't breathe, so the same content renders as a plain
 * vertical stack of cards (no interaction needed). Both trees are always in the
 * DOM behind responsive `hidden` — no JS media query, so nothing flashes on
 * hydration and every panel's full text stays available to screen readers.
 */

/** The revealed detail — shared by the active desktop panel and mobile cards. */
function ProjectDetail({ project }: { project: Project }) {
  const { t } = useLocale();
  return (
    <div className="relative z-10 flex h-full flex-col">
      {/* Header: name + role·period subtitle, balanced by the oversized index. */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h3 className="display max-w-[16ch] text-3xl leading-[0.95] text-fg sm:text-5xl">
            {project.name}
          </h3>
          <p className="mt-3 font-mono text-xs text-fg-subtle sm:text-sm">
            {project.role} · {project.period}
          </p>
        </div>
        <span className="display shrink-0 text-5xl leading-none text-accent sm:text-7xl">
          {String(project.index).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-6 max-w-2xl sm:mt-8">
        <p className="text-lg font-medium leading-snug text-fg sm:text-2xl sm:leading-snug">
          {project.oneLiner}
        </p>
        {/* NB: avoid Tailwind's `text-base` — the project defines a `--color-base`
            token, so `text-base` resolves to color:var(--color-base) and paints
            the text invisible. Always set an explicit size here. */}
        <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-fg-muted sm:mt-4 sm:text-[1.0625rem]">
          {project.description}
        </p>

        {(project.links.demo || project.links.source) && (
          <div className="mt-5 flex flex-wrap gap-5">
            {project.links.demo && (
              <a
                href={project.links.demo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-fg transition-colors hover:text-accent"
              >
                <ExternalLink className="size-4" /> {t.work.liveDemo}
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

      {/* Footer: the full tech stack as a wrapping row (own the full width). */}
      <ul className="mt-auto flex flex-wrap gap-2 border-t border-line pt-5">
        {project.tech.map((tech) => (
          <li
            key={tech}
            className="rounded-full border border-line px-3 py-1 font-mono text-xs text-fg-muted"
          >
            {tech}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Work() {
  const { t } = useLocale();
  const { projects } = useContent();
  // Which panel is spotlit on desktop. Defaults to the first (newest) project.
  const [active, setActive] = useState(0);

  return (
    <section id="work" className="px-6 py-28 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow mb-3">{t.work.eyebrow}</p>
              <h2 className="display text-4xl text-fg sm:text-6xl">
                {t.work.heading}
              </h2>
            </div>
            <p className="hidden font-mono text-xs text-fg-subtle lg:block">
              {t.work.hint}
            </p>
          </div>
        </Reveal>

        {/* ── Desktop: expanding spotlight panels ─────────────────────────── */}
        <div className="mt-12 hidden h-[34rem] gap-3 lg:flex">
          {projects.map((project, i) => {
            const isActive = active === i;
            return (
              <div
                key={project.id}
                tabIndex={0}
                aria-label={project.name}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={`group relative cursor-pointer overflow-hidden rounded-3xl border bg-surface shadow-2xl outline-none transition-[flex-grow,border-color] duration-500 ease-out focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none ${
                  isActive ? "border-accent/40" : "border-line"
                }`}
                style={{ flexGrow: isActive ? 6 : 1, flexBasis: 0 }}
              >
                {/* Lime edge marks the spotlit panel. */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-y-0 left-0 z-30 w-1 bg-accent transition-opacity duration-500 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                />
                {/* Ambient accent glow — depth, not a flat panel. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/10 blur-3xl"
                />

                {/* Spine (collapsed): index up top, vertical name, period. */}
                <div
                  aria-hidden={isActive}
                  className={`absolute inset-0 flex flex-col items-center justify-between py-8 transition-opacity duration-300 ${
                    isActive ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <span className="display text-3xl leading-none text-accent">
                    {String(project.index).padStart(2, "0")}
                  </span>
                  <span className="display whitespace-nowrap text-2xl text-fg-muted [writing-mode:vertical-rl] rotate-180">
                    {project.name}
                  </span>
                  <span className="whitespace-nowrap font-mono text-[10px] text-fg-subtle [writing-mode:vertical-rl] rotate-180">
                    {project.period}
                  </span>
                </div>

                {/* Content (active): fills the panel. It's clipped by overflow-hidden
                    and faded (delay-100) while the panel widens, so the reflow as the
                    width animates happens off-screen and unseen. */}
                <div
                  className={`absolute inset-0 flex flex-col p-8 transition-opacity duration-500 lg:p-10 ${
                    isActive
                      ? "opacity-100 delay-100"
                      : "pointer-events-none opacity-0"
                  }`}
                >
                  <ProjectDetail project={project} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Mobile / reduced-width: plain vertical card stack ───────────── */}
        <div className="mt-12 flex flex-col gap-6 lg:hidden">
          {projects.map((project) => (
            <article
              key={project.id}
              className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-2xl sm:p-8"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-accent/10 blur-3xl"
              />
              <ProjectDetail project={project} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
