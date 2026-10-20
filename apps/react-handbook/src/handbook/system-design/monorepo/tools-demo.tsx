"use client";

import { Check, Minus, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { CAPABILITIES, RESEARCHED, STACKS, TOOLS, stackLevel, type Capability, type Level } from "./tools";

const LEVEL_LABEL: Record<Level, string> = { yes: "Yes", partial: "Partly", no: "No" };

function LevelMark({ level }: { level: Level }) {
  const Icon = level === "yes" ? Check : level === "partial" ? Minus : X;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        level === "yes" && "text-success",
        level === "partial" && "text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning",
        level === "no" && "text-foreground/75",
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {LEVEL_LABEL[level]}
    </span>
  );
}

export function ToolsDemo() {
  const [needs, setNeeds] = useState<ReadonlySet<Capability>>(() => new Set<Capability>(["linking", "graph", "remote-cache", "affected"]));

  function handleToggle(id: Capability, checked: boolean) {
    setNeeds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const picked = CAPABILITIES.filter((c) => needs.has(c.id));

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex min-w-0 flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-medium text-foreground/75">What does your repo need?</legend>
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <label key={c.id} className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={needs.has(c.id)} onChange={(e) => handleToggle(c.id, e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
              <span className="flex flex-col">
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-foreground/75">{c.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2" aria-live="polite">
        <h4 className="text-sm font-semibold">Common stacks against your list</h4>
        {picked.length === 0 ? (
          <p className="text-sm text-foreground/75">Pick at least one need to compare the stacks.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {STACKS.map((stack) => {
              const levels = picked.map((c) => ({ c, level: stackLevel(stack.tools, c.id) }));
              const missing = levels.filter((l) => l.level !== "yes");
              return (
                <li key={stack.name} className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{stack.name}</span>
                    <LevelMark level={missing.length === 0 ? "yes" : missing.some((l) => l.level === "no") ? "no" : "partial"} />
                  </p>
                  <p className="text-xs text-foreground/85">
                    {missing.length === 0
                      ? "Covers everything you picked."
                      : `Gaps: ${missing.map((l) => `${l.c.label.toLowerCase()} (${LEVEL_LABEL[l.level].toLowerCase()})`).join(", ")}.`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div role="region" aria-label="Tool capability matrix (scrollable)" tabIndex={0} className="relative overflow-x-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <table className="w-full min-w-[860px] text-xs">
          <caption className="px-3 pt-2 text-left text-foreground/75">What each tool does, as of {RESEARCHED}. Picked needs are highlighted.</caption>
          <thead className="text-left">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium text-foreground/75">Capability</th>
              {TOOLS.map((t) => (
                <th key={t.id} scope="col" className="px-3 py-2 align-bottom font-medium">
                  <span className="block">{t.name}</span>
                  <span className="block font-normal text-foreground/75">
                    {t.role} · {t.version}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((c) => (
              <tr key={c.id} className={cn("border-t align-top", needs.has(c.id) && "bg-primary/5")}>
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  {c.label}
                </th>
                {TOOLS.map((t) => (
                  <td key={t.id} className="px-3 py-2">
                    <LevelMark level={t.cells[c.id].level} />
                    <span className="mt-0.5 block text-foreground/85">{t.cells[c.id].note}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-foreground/75">
        One snapshot, and tools move fast: check their docs before you choose. Also worth knowing: Rush (installs, builds and publishes, from Microsoft), Lerna (now
        maintained by the Nx team and runs tasks through Nx) and Bazel (a multi-language build system with remote execution, heavy for a JavaScript-only repo).
      </p>
    </div>
  );
}
