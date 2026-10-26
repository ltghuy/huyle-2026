"use client";

import { useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { announce, read } from "./a11y-reader";
import { ReaderBox, useDomSnapshot, WrongWay } from "./ui";

type Counts = { pointer: number; keyboard: number };
type VersionId = "div" | "aria" | "button";

const VERSIONS: { id: VersionId; title: string; code: string }[] = [
  { id: "div", title: "Clickable div", code: "<div onClick={save}>Save</div>" },
  { id: "aria", title: "div patched with ARIA", code: '<div role="button" tabIndex={0} onClick={save} onKeyDown={enterOrSpace}>' },
  { id: "button", title: "Native button", code: "<button onClick={save}>Save</button>" },
];

const LOOK = cn(buttonVariants({ size: "sm" }), "w-fit cursor-pointer select-none");
const ZERO: Counts = { pointer: 0, keyboard: 0 };

export function SemanticsDemo() {
  const [counts, setCounts] = useState<Record<VersionId, Counts>>({ div: ZERO, aria: ZERO, button: ZERO });

  function handleActivate(id: VersionId, by: keyof Counts) {
    setCounts((current) => ({ ...current, [id]: { ...current[id], [by]: current[id][by] + 1 } }));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/85">
        All three look the same. Click each, then try to reach it with <kbd className="font-mono">Tab</kbd> and press{" "}
        <kbd className="font-mono">Enter</kbd> or <kbd className="font-mono">Space</kbd>.
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        {VERSIONS.map((version) => (
          <Version key={version.id} {...version} counts={counts[version.id]} onActivate={(by) => handleActivate(version.id, by)} />
        ))}
      </div>
    </div>
  );
}

function Version({
  id,
  title,
  code,
  counts,
  onActivate,
}: {
  id: VersionId;
  title: string;
  code: string;
  counts: Counts;
  onActivate: (by: keyof Counts) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reading = useDomSnapshot(ref, readControl);
  const [role, name, focusable, line] = reading ? (JSON.parse(reading) as [string, string, boolean, string]) : ["…", "…", false, "…"];

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault(); // Space would scroll the page
    onActivate("keyboard");
  }

  function handleButtonClick(event: React.MouseEvent) {
    // A keyboard-triggered click has no pointer position: detail is 0.
    onActivate(event.detail === 0 ? "keyboard" : "pointer");
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium">{title}</h4>
        {id === "div" ? <WrongWay /> : null}
      </div>
      <code className="font-mono text-xs break-all text-foreground/75">{code}</code>
      <div ref={ref}>
        {id === "div" ? (
          <div data-control className={LOOK} onClick={() => onActivate("pointer")}>
            Save
          </div>
        ) : id === "aria" ? (
          <div data-control role="button" tabIndex={0} className={LOOK} onClick={() => onActivate("pointer")} onKeyDown={handleKeyDown}>
            Save
          </div>
        ) : (
          <button data-control type="button" className={LOOK} onClick={handleButtonClick}>
            Save
          </button>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Role</dt>
        <dd className="font-mono">{role}</dd>
        <dt className="text-muted-foreground">Name</dt>
        <dd className="font-mono">{name}</dd>
        <dt className="text-muted-foreground">Reached by Tab</dt>
        <dd className="font-medium">{focusable ? "yes" : "no"}</dd>
        <dt className="text-muted-foreground">Activated</dt>
        <dd className="tabular-nums">
          {counts.pointer} by pointer, {counts.keyboard} by keyboard
        </dd>
      </dl>
      <ReaderBox>{line}</ReaderBox>
    </div>
  );
}

function readControl(root: HTMLElement) {
  const control = root.querySelector("[data-control]");
  if (!control) return "";
  const reading = read(control);
  return JSON.stringify([reading.role ?? "none (generic)", reading.name || "none", reading.focusable, announce(control)]);
}
