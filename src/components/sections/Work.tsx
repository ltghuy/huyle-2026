"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { projects } from "@/content/projects";
import { GithubIcon } from "@/components/icons/BrandIcons";
import { Reveal } from "@/components/motion/Reveal";

export function Work() {
  const [index, setIndex] = useState(0);
  const project = projects[index];
  const go = (delta: number) =>
    setIndex((prev) => (prev + delta + projects.length) % projects.length);

  return (
    <section id="work" className="px-6 py-28 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="eyebrow mb-3">Selected Work</p>
          <h2 className="display text-4xl text-fg sm:text-6xl">Projects</h2>
        </Reveal>

        <div
          aria-live="polite"
          className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,auto)_1fr] lg:gap-14"
        >
          <p className="display select-none text-7xl leading-none text-accent/80 sm:text-8xl lg:text-9xl">
            {String(project.index).padStart(2, "0")}
          </p>

          <div>
            <h3 className="display text-3xl text-fg sm:text-4xl">{project.name}</h3>
            <p className="mt-2 font-mono text-sm text-fg-subtle">
              {project.role} · {project.period}
            </p>
            <p className="mt-3 text-lg text-accent/90">{project.oneLiner}</p>
            <p className="mt-4 max-w-2xl text-fg-muted">{project.description}</p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <li
                  key={t}
                  className="rounded-md border border-line bg-surface px-2.5 py-1 font-mono text-xs text-fg-muted"
                >
                  {t}
                </li>
              ))}
            </ul>

            {(project.links.demo || project.links.source) && (
              <div className="mt-6 flex flex-wrap gap-4">
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
        </div>

        <div className="mt-12 flex items-center gap-5">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous project"
            className="grid size-11 place-items-center rounded-full border border-line text-fg-muted transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            <ArrowLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next project"
            className="grid size-11 place-items-center rounded-full border border-line text-fg-muted transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            <ArrowRight className="size-4" />
          </button>
          <span className="font-mono text-sm text-fg-subtle">
            {String(project.index).padStart(2, "0")}{" "}
            <span className="text-fg-subtle/60">/ {String(projects.length).padStart(2, "0")}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
