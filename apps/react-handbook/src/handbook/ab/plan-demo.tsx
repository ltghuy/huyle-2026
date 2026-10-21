"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Choice } from "@/handbook/jwt/token-view";

// Write an experiment plan; the page writes it back and points out the usual gaps.

const METRICS = [
  { value: "checkout", label: "Visitors who start checkout", perVisitor: true, button: true },
  { value: "revenue", label: "Revenue per visitor", perVisitor: true, button: true },
  { value: "clicks", label: "Clicks on the button, per page view", perVisitor: false, button: true },
  { value: "newsletter", label: "Newsletter sign-ups", perVisitor: true, button: false },
] as const;

const GUARDRAILS = [
  { value: "none", label: "None" },
  { value: "refunds", label: "Refund rate" },
  { value: "speed", label: "Page load time" },
  { value: "errors", label: "Error rate" },
] as const;

const UNITS = [
  { value: "visitor", label: "Visitor" },
  { value: "session", label: "Session" },
  { value: "pageview", label: "Page view" },
] as const;

type Metric = (typeof METRICS)[number]["value"];
type Guardrail = (typeof GUARDRAILS)[number]["value"];
type Unit = (typeof UNITS)[number]["value"];

export function PlanDemo() {
  const ids = { hypothesis: useId(), control: useId(), variant: useId(), share: useId() };
  const [hypothesis, setHypothesis] = useState("If the button says what happens next, more visitors will start checkout, because “Add to cart” makes them think they still have to find the cart.");
  const [control, setControl] = useState("Add to cart");
  const [variant, setVariant] = useState("Buy now");
  const [metric, setMetric] = useState<Metric>("checkout");
  const [guardrail, setGuardrail] = useState<Guardrail>("none");
  const [unit, setUnit] = useState<Unit>("visitor");
  const [share, setShare] = useState(100);

  const m = METRICS.find((x) => x.value === metric)!;
  const g = GUARDRAILS.find((x) => x.value === guardrail)!;
  const u = UNITS.find((x) => x.value === unit)!;

  const warnings: string[] = [];
  if (!/because/i.test(hypothesis)) warnings.push("The hypothesis has no “because”: say why the change should work, so a result teaches you something either way.");
  if (guardrail === "none") warnings.push("No guardrail: pick a metric that must not get worse (refunds, speed, errors), or a win on clicks can hide a loss that matters.");
  if (!m.button) warnings.push(`“${m.label}” can't be moved by a button on the product page, so the experiment can only find noise.`);
  if (unit !== "visitor" && m.perVisitor) warnings.push(`Assigning per ${u.label.toLowerCase()} while measuring per visitor: one person sees both versions, and the samples aren't independent.`);
  if (!m.perVisitor && unit === "visitor") warnings.push("Measuring per page view while assigning per visitor: busy visitors count many times; prefer a per-visitor metric.");
  if (share < 20) warnings.push(`Only ${share}% of traffic is in the test, so it takes ${Math.round(100 / share)}× longer to reach the same sample size.`);
  if (control.trim() === variant.trim()) warnings.push("The control and the variant are the same.");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.hypothesis}>Hypothesis</Label>
            <Textarea id={ids.hypothesis} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} className="min-h-20 text-sm" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.control}>Control (A)</Label>
              <Input id={ids.control} value={control} onChange={(e) => setControl(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.variant}>Variant (B)</Label>
              <Input id={ids.variant} value={variant} onChange={(e) => setVariant(e.target.value)} />
            </div>
          </div>
          <Choice legend="Primary metric" value={metric} options={METRICS} onChange={setMetric} />
          <Choice legend="Guardrail metric" value={guardrail} options={GUARDRAILS} onChange={setGuardrail} />
          <Choice legend="Unit of assignment" value={unit} options={UNITS} onChange={setUnit} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.share}>Traffic in the experiment: {share}%</Label>
            <input id={ids.share} type="range" min={5} max={100} step={5} value={share} onChange={(e) => setShare(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
          <h4 className="text-sm font-medium">The plan</h4>
          <p className="rounded-lg border p-3 text-sm leading-relaxed">
            We&apos;ll show {share}% of visitors, assigned per {u.label.toLowerCase()}, either “{control || "…"}” (A) or “{variant || "…"}” (B), half each. We
            expect B to raise <strong>{m.label.toLowerCase()}</strong>. {hypothesis.trim() ? `Why: ${hypothesis.trim()}` : ""}{" "}
            {guardrail === "none" ? "Nothing else is watched." : `We'll stop if ${g.label.toLowerCase()} gets worse.`}
          </p>
          {warnings.length > 0 ? (
            <ul className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-sm">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-muted/40 p-3 text-sm">No gaps found: the metric can move, a guardrail is watched, and the unit matches the metric.</p>
          )}
        </div>
      </div>
    </div>
  );
}
