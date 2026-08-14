"use client";

import { useState } from "react";
import { skillGroups } from "@/content/skills";
import { Reveal } from "@/components/motion/Reveal";

const FILTERS = [
  { id: "all", label: "All" },
  ...skillGroups.map((g) => ({ id: g.id, label: g.label })),
] as const;

function CornerBrackets() {
  const base = "pointer-events-none absolute h-3 w-3 border-accent/40";
  return (
    <>
      <span className={`${base} left-0 top-0 border-l border-t`} />
      <span className={`${base} right-0 top-0 border-r border-t`} />
      <span className={`${base} bottom-0 left-0 border-b border-l`} />
      <span className={`${base} bottom-0 right-0 border-b border-r`} />
    </>
  );
}

export function WhatIDo() {
  const [active, setActive] = useState<string>("all");
  const groups =
    active === "all" ? skillGroups : skillGroups.filter((g) => g.id === active);

  return (
    <section id="what-i-do" className="px-6 py-28 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="eyebrow mb-3">What I Do</p>
          <h2 className="display text-4xl text-fg sm:text-6xl">Capabilities</h2>
        </Reveal>

        <div className="mt-8 flex flex-wrap gap-2" aria-label="Skill filters">
          {FILTERS.map((f) => {
            const selected = active === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActive(f.id)}
                className={`rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.14em] transition-colors duration-200 ${
                  selected
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-line text-fg-muted hover:border-accent/50 hover:text-fg"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="relative rounded-lg border border-line bg-surface p-6"
            >
              <CornerBrackets />
              <h3 className="display text-2xl text-fg">{group.label}</h3>
              <p className="mt-2 text-sm text-fg-muted">{group.blurb}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {group.items.map((skill) => (
                  <li
                    key={skill.name}
                    className="rounded-md border border-line bg-surface-raised px-2.5 py-1 text-xs text-fg-muted"
                  >
                    {skill.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
