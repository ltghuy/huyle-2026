"use client";

import { Bot, Square } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";

import { ALL_OFF, ALL_ON, type Techniques } from "./search-engine";
import { ROBOT_PHRASES, ROBOT_SPEEDS } from "./typing-robot";

const SWITCHES: { key: keyof Techniques; label: string; without: string }[] = [
  { key: "debounce", label: "Debounce", without: "Off: a request for every changed query." },
  { key: "cache", label: "Cache", without: "Off: every query goes to the network, even one you just ran." },
  { key: "abort", label: "Abort older requests", without: "Off: superseded requests run to completion." },
  { key: "staleGuard", label: "Stale-response guard", without: "Off: whichever response arrives last is shown." },
];

export type RobotState = { phrase: string; speed: number; running: boolean };

export function TechniquePanel({
  techniques,
  onTechniquesChange,
  robot,
  onRobotChange,
  onRobotStart,
  onRobotStop,
}: {
  techniques: Techniques;
  onTechniquesChange: (changes: Partial<Techniques>) => void;
  robot: RobotState;
  onRobotChange: (changes: Partial<RobotState>) => void;
  onRobotStart: () => void;
  onRobotStop: () => void;
}) {
  const id = useId();

  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-heading`} className="text-sm font-semibold">
          Techniques
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onTechniquesChange(ALL_ON)}>
            All on
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onTechniquesChange(ALL_OFF)}>
            All off (naive)
          </Button>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {SWITCHES.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer gap-2.5 rounded-lg border p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
              <input
                type="checkbox"
                checked={techniques[item.key]}
                onChange={(e) => onTechniquesChange({ [item.key]: e.target.checked })}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-foreground/75">{item.without}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-3 border-t pt-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-phrase`} className="text-xs font-medium text-muted-foreground">
            Typing robot types
          </label>
          <select
            id={`${id}-phrase`}
            value={robot.phrase}
            onChange={(e) => onRobotChange({ phrase: e.target.value })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {ROBOT_PHRASES.map((phrase) => (
              <option key={phrase} value={phrase}>
                {phrase}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-speed`} className="text-xs font-medium text-muted-foreground">
            Speed
          </label>
          <select
            id={`${id}-speed`}
            value={String(robot.speed)}
            onChange={(e) => onRobotChange({ speed: Number(e.target.value) })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            {ROBOT_SPEEDS.map((speed) => (
              <option key={speed.value} value={String(speed.value)}>
                {speed.label}
              </option>
            ))}
          </select>
        </div>
        {robot.running ? (
          <Button type="button" variant="outline" onClick={onRobotStop}>
            <Square aria-hidden /> Stop
          </Button>
        ) : (
          <Button type="button" onClick={onRobotStart}>
            <Bot aria-hidden /> Type it
          </Button>
        )}
      </div>
    </section>
  );
}
