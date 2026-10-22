"use client";

import { Check, CircleHelp, Minus, X } from "lucide-react";
import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CodeBlock } from "@/handbook/e2e/code-block";

import { FieldSelect } from "../field-select";
import { CONTROL_GROUPS, GOALS, outcomes, settings, type ControlKey, type Controls, type GoalId, type Outcome } from "./controls";

type Choice = GoalId | "custom";

const GOAL_OPTIONS: { value: Choice; label: string }[] = [
  ...Object.entries(GOALS).map(([value, goal]) => ({ value: value as GoalId, label: goal.label })),
  { value: "custom", label: "My own settings" },
];

const VALUE_LABEL: Record<Outcome["value"], string> = { yes: "Yes", no: "No", limited: "Limited", "n/a": "Not applicable", unknown: "Unknown" };

function OutcomeCell({ outcome }: { outcome: Outcome }) {
  const Icon = outcome.value === "yes" ? Check : outcome.value === "no" ? X : outcome.value === "limited" ? Minus : CircleHelp;
  const tone = outcome.value === "yes" ? "text-success" : outcome.value === "no" ? "text-destructive" : "text-foreground/80";
  return (
    <TableCell className="align-top text-xs whitespace-normal">
      <span className={`inline-flex items-center gap-1 font-medium ${tone}`}>
        <Icon aria-hidden className="size-4" />
        {VALUE_LABEL[outcome.value]}
      </span>
      <span className="block text-foreground/75">{outcome.why}</span>
    </TableCell>
  );
}

function ControlCheckbox({ id, label, on, off, checked, onChange }: { id: string; label: string; on: string; off: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(next) => onChange(next === true)} className="mt-0.5" />
      <Label htmlFor={id} className="flex-col items-start gap-0 text-xs font-normal">
        <span className="font-medium">{label}</span>
        <span className="text-foreground/75">{checked ? on : off}</span>
      </Label>
    </div>
  );
}

export function ControlsDemo() {
  const [choice, setChoice] = useState<Choice>("noTraining");
  const [controls, setControls] = useState<Controls>(GOALS.noTraining.controls);
  const baseId = useId();

  const rows = outcomes(controls);
  const out = settings(controls);
  const code = [`# robots.txt\n${out.robots}`, out.meta.length > 0 ? `\n<!-- In the page's <head> -->\n${out.meta.join("\n")}` : "", out.console ? `\n# ${out.console}` : ""].join("");

  function handleGoal(next: Choice) {
    setChoice(next);
    if (next !== "custom") setControls(GOALS[next].controls);
  }

  function handleControl(key: ControlKey, checked: boolean) {
    setChoice("custom");
    setControls((c) => ({ ...c, [key]: checked }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="max-w-md">
        <FieldSelect label="What do you want?" value={choice} options={GOAL_OPTIONS} onChange={handleGoal} />
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CONTROL_GROUPS.map((group) => (
          <fieldset key={group.vendor} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
            <legend className="px-1 text-xs font-medium">{group.vendor}</legend>
            {group.controls.map((control) => (
              <ControlCheckbox
                key={control.key}
                id={`${baseId}-${control.key}`}
                label={control.label}
                on={control.on}
                off={control.off}
                checked={controls[control.key]}
                onChange={(checked) => handleControl(control.key, checked)}
              />
            ))}
          </fieldset>
        ))}
      </div>
      <div aria-live="polite" className="flex min-w-0 flex-col gap-4">
        <Table aria-label="Where the site appears, per vendor">
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Normal search</TableHead>
              <TableHead>AI answers</TableHead>
              <TableHead>Training</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.vendor}>
                <TableCell className="align-top text-xs font-medium">{row.vendor}</TableCell>
                <OutcomeCell outcome={row.search} />
                <OutcomeCell outcome={row.ai} />
                <OutcomeCell outcome={row.training} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <CodeBlock path="What to set" code={code} lang="text" />
      </div>
      <p className="text-xs text-foreground/75">
        A summary of each vendor&apos;s documentation as of 22 October 2026, not a test of their systems. User-request fetchers such as ChatGPT-User
        aren&apos;t covered: they fetch a page when someone asks, and several vendors say they may ignore robots.txt.
      </p>
    </div>
  );
}
