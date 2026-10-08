"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { LANDMARK_ROLES, read, roleWord } from "./a11y-reader";
import { Toggle, useDomSnapshot } from "./ui";

type Row = { order: number | null; role: string; name: string; from: string };

const NAME_FROM_TEXT: Record<string, string> = {
  labelledby: "aria-labelledby",
  label: "<label>",
  "aria-label": "aria-label",
  content: "its text",
  alt: "alt",
  legend: "<legend>",
  caption: "<caption>",
  title: "title",
  placeholder: "placeholder",
  none: "missing",
};

/** A small badge drawn on the design, like the notes a designer adds before handoff. */
function Badge({ show, children, tone = "focus" }: { show: boolean; children: React.ReactNode; tone?: "focus" | "structure" }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-[0.6875rem] font-semibold",
        tone === "focus" ? "bg-primary text-primary-foreground" : "border border-primary text-primary",
      )}
    >
      {children}
    </span>
  );
}

export function AnnotationsDemo() {
  const [show, setShow] = useState(true);
  const sampleRef = useRef<HTMLDivElement>(null);
  const snapshot = useDomSnapshot(sampleRef, readRows);
  const rows: Row[] = snapshot ? JSON.parse(snapshot) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-sm">
        <Toggle checked={show} onCheckedChange={setShow} title="Show accessibility annotations" detail="Landmarks, headings, focus order and names" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div ref={sampleRef}>
          <section aria-labelledby="annotations-title" className={cn("relative flex flex-col gap-3 rounded-lg border p-4", show && "outline-2 outline-offset-2 outline-primary/40 outline-dashed")}>
            <div className="flex items-start justify-between gap-2">
              <h4 id="annotations-title" className="flex items-center gap-2 font-semibold">
                <Badge show={show} tone="structure">
                  R
                </Badge>
                <Badge show={show} tone="structure">
                  H4
                </Badge>
                Get the weekly menu
              </h4>
              <span className="flex items-center gap-1">
                <Badge show={show}>1</Badge>
                <Button variant="ghost" size="icon-sm" aria-label="Dismiss">
                  <X aria-hidden />
                </Button>
              </span>
            </div>
            <p className="text-sm text-foreground/85">New breads and the week&apos;s specials, every Monday.</p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="annotations-email" className="flex items-center gap-2 text-sm font-medium">
                <Badge show={show}>2</Badge>
                Email
              </label>
              <Input id="annotations-email" type="email" autoComplete="email" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Badge show={show}>3</Badge>
              <input type="checkbox" className="size-4 accent-primary" />
              Also tell me about baking classes
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2">
                <Badge show={show}>4</Badge>
                <Button size="sm">Subscribe</Button>
              </span>
              <span className="flex items-center gap-2 text-sm">
                <Badge show={show}>5</Badge>
                <a href="#patterns-and-design" className="underline underline-offset-4">
                  Privacy notice
                </a>
              </span>
            </div>
          </section>
        </div>

        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="mb-2 text-left text-xs font-medium text-foreground/75">Read from the component (simplified)</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-1 pr-2 font-medium">
                  Tab
                </th>
                <th scope="col" className="py-1 pr-2 font-medium">
                  Role
                </th>
                <th scope="col" className="py-1 pr-2 font-medium">
                  Accessible name
                </th>
                <th scope="col" className="py-1 font-medium">
                  Name from
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-mono tabular-nums">{row.order ?? "–"}</td>
                  <td className="py-1 pr-2">{row.role}</td>
                  <td className="py-1 pr-2 font-mono">{row.name || "none"}</td>
                  <td className="py-1">{row.from}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function readRows(root: HTMLElement) {
  const rows: Row[] = [];
  let order = 0;
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    if (el.closest("[aria-hidden='true']")) continue;
    const reading = read(el);
    const role = reading.role;
    const isStructure = role !== null && (LANDMARK_ROLES.has(role) || role === "heading");
    if (!isStructure && !reading.focusable) continue;
    rows.push({
      order: reading.focusable ? ++order : null,
      role: roleWord(el, role) || "generic",
      name: reading.name,
      from: NAME_FROM_TEXT[reading.nameFrom],
    });
  }
  return JSON.stringify(rows);
}
