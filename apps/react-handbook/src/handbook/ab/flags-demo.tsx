"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { decide, FLAG, overlap, VISITORS, type FlagRules } from "./flags";

const START: FlagRules = { percent: 10, staffFirst: true, kill: false, reuseHash: false };

type Split = ReturnType<typeof overlap>;

function overlapText(rules: FlagRules, split: Split, other: Split) {
  if (rules.kill) return "The kill switch is on, so the change reaches nobody and can't touch the experiment.";
  if (split.total === 0) return "The rollout reaches nobody yet.";
  if (!rules.reuseHash) {
    return `The rollout reaches ${split.total.toLocaleString("en-US")} of them: ${split.a}% in variant A and ${split.b}% in B, close to the experiment's own 50/50. With the experiment's hash it would be ${other.a}% A and ${other.b}% B.`;
  }
  return `The rollout reaches ${split.total.toLocaleString("en-US")} of them: ${split.a}% in variant A and ${split.b}% in B. Both use the same buckets and the rollout takes the lowest ones, which are A first, so whatever it ships lands mostly or only in one variant and biases the result. With the flag's own salt it would be ${other.a}% A and ${other.b}% B.`;
}

const onIds = (rules: FlagRules) => new Set(VISITORS.filter((v) => decide(v, rules).on).map((v) => v.id));

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(next) => onChange(next === true)} className="mt-0.5" />
      <Label htmlFor={id} className="flex-col items-start gap-0 text-sm font-normal">
        {label}
        <span className="text-xs text-foreground/75">{hint}</span>
      </Label>
    </div>
  );
}

export function FlagsDemo() {
  const [rules, setRules] = useState<FlagRules>(START);
  // Who had the change before the last rollout change, to show that raising the percentage keeps them.
  const [before, setBefore] = useState<{ percent: number; ids: Set<string> } | null>(null);
  const baseId = useId();

  const decisions = VISITORS.map((v) => ({ visitor: v, ...decide(v, rules) }));
  const on = decisions.filter((d) => d.on).length;
  const split = overlap(rules);
  const other = overlap({ ...rules, reuseHash: !rules.reuseHash });
  const kept = before ? [...before.ids].filter((id) => decisions.find((d) => d.visitor.id === id)?.on).length : 0;

  function handlePercent(percent: number) {
    setBefore({ percent: rules.percent, ids: onIds(rules) });
    setRules((r) => ({ ...r, percent }));
  }

  function handleRule(key: "staffFirst" | "kill" | "reuseHash", checked: boolean) {
    setBefore(null);
    setRules((r) => ({ ...r, [key]: checked }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={`${baseId}-percent`}>
            Roll <code className="font-mono text-xs">{FLAG}</code> out to {rules.percent}% of visitors
          </Label>
          <input
            id={`${baseId}-percent`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={rules.percent}
            onChange={(e) => handlePercent(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <Toggle id={`${baseId}-staff`} label="Staff first" hint="A targeting rule: staff get it before anyone else" checked={rules.staffFirst} onChange={(c) => handleRule("staffFirst", c)} />
          <Toggle id={`${baseId}-kill`} label="Kill switch" hint="Turns the change off for everyone, with no deploy" checked={rules.kill} onChange={(c) => handleRule("kill", c)} />
          <Toggle
            id={`${baseId}-reuse`}
            label="Reuse the experiment's hash"
            hint="Bucket with the A/B experiment's name instead of the flag's own"
            checked={rules.reuseHash}
            onChange={(c) => handleRule("reuseHash", c)}
          />
        </div>
      </div>

      <div aria-live="polite" className="flex min-w-0 flex-col gap-3">
        <p className="text-sm">
          <span className="font-medium tabular-nums">{on}</span> of {VISITORS.length} sample visitors get the change.
          {before && rules.percent > before.percent && before.ids.size > 0 ? ` All ${kept} of the ${before.ids.size} who had it at ${before.percent}% still have it: raising the percentage only adds people.` : null}
          {before && rules.percent < before.percent ? ` Lowering it took the change away from ${before.ids.size - kept} visitors who had it.` : null}
        </p>
        <ul aria-label="Sample visitors" className="grid grid-cols-10 gap-1 sm:max-w-md">
          {decisions.map((d) => (
            <li
              key={d.visitor.id}
              title={`${d.visitor.id}${d.visitor.staff ? " (staff)" : ""}: ${d.on ? "on" : "off"}, ${d.reason}`}
              className={cn("flex aspect-square items-center justify-center rounded-sm border text-[0.625rem]", d.on ? "border-primary bg-primary text-primary-foreground" : "bg-background text-foreground/60")}
            >
              {d.on ? <Check aria-hidden className="size-3" /> : d.visitor.staff ? "S" : null}
              <span className="sr-only">
                {d.visitor.id}
                {d.visitor.staff ? ", staff" : ""}: {d.on ? "on" : "off"}, {d.reason}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-foreground/75">A check marks a visitor who gets the change; S marks staff without it. Hover or use a screen reader for the reason.</p>

        <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 text-sm">
          <p className="font-medium">Overlap with the A/B experiment on this page, over 10,000 simulated visitors</p>
          <p className="text-foreground/85">{overlapText(rules, split, other)}</p>
        </div>
      </div>
      <p className="text-xs text-foreground/75">
        A simulation with made-up visitors, using the same FNV-1a bucketing as the live experiment above. The kill switch wins over every rule, then
        the staff rule, then the rollout.
      </p>
    </div>
  );
}
