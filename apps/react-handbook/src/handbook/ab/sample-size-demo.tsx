"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Choice } from "@/handbook/jwt/token-view";

import { type Arm, drawConversions, sampleSizePerArm, wilson, zTest } from "./stats";

const NUMBER = new Intl.NumberFormat("en-US");
const MAX_DAYS = 90;

const ALPHAS = [
  { value: "0.01", label: "1%" },
  { value: "0.05", label: "5%" },
  { value: "0.1", label: "10%" },
] as const;

const POWERS = [
  { value: "0.8", label: "80%" },
  { value: "0.9", label: "90%" },
] as const;

type Day = { day: number; a: Arm; b: Arm };

function pct(x: number, digits = 2) {
  return `${(x * 100).toFixed(digits)}%`;
}

function Field({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const id = useId();
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(Number(event.target.value));
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ""} onChange={handleChange} />
    </div>
  );
}

function meaning(pValue: number, alpha: number, diff: number) {
  const significant = pValue < alpha;
  const direction = diff > 0 ? "higher" : "lower";
  return significant
    ? `p = ${pValue.toFixed(4)}, below ${alpha}: if A and B truly converted the same, a difference this large would show up less than ${alpha * 100}% of the time. B's rate is ${direction}. It does not mean there's a ${((1 - pValue) * 100).toFixed(1)}% chance B is better, and the true lift may be smaller than the one observed.`
    : `p = ${pValue.toFixed(4)}, not below ${alpha}: a difference this large is common when A and B are the same. That is not proof they are the same; the test may simply be too small for the true effect.`;
}

export function SampleSizeDemo() {
  const [baselinePct, setBaselinePct] = useState(5);
  const [liftPct, setLiftPct] = useState(10);
  const [alpha, setAlpha] = useState<(typeof ALPHAS)[number]["value"]>("0.05");
  const [power, setPower] = useState<(typeof POWERS)[number]["value"]>("0.8");
  const [daily, setDaily] = useState(8000);
  const [trueLiftPct, setTrueLiftPct] = useState(10);
  const [days, setDays] = useState<Day[] | null>(null);

  const baseline = baselinePct / 100;
  const n = sampleSizePerArm(baseline, liftPct / 100, Number(alpha), Number(power));
  const problems: string[] = [];
  if (!(baselinePct > 0 && baselinePct < 100)) problems.push("The baseline rate has to be between 0% and 100%.");
  if (!(liftPct > 0)) problems.push("The smallest effect worth finding has to be above 0%; an effect of zero needs an infinite sample.");
  if (baseline * (1 + liftPct / 100) >= 1) problems.push("That lift would push the rate to 100% or more.");
  if (!(daily > 0)) problems.push("Daily traffic has to be above zero, or the test never ends.");
  const plannedDays = n && daily > 0 ? Math.ceil((2 * n) / daily) : null;

  function handleSimulate() {
    if (!n || !plannedDays) return;
    const total = Math.min(plannedDays, MAX_DAYS);
    const perArm = Math.floor(daily / 2);
    const pb = Math.min(0.999, baseline * (1 + trueLiftPct / 100));
    const out: Day[] = [];
    let a: Arm = { visitors: 0, conversions: 0 };
    let b: Arm = { visitors: 0, conversions: 0 };
    for (let day = 1; day <= total; day++) {
      a = { visitors: a.visitors + perArm, conversions: a.conversions + drawConversions(perArm, baseline) };
      b = { visitors: b.visitors + perArm, conversions: b.conversions + drawConversions(perArm, pb) };
      out.push({ day, a, b });
    }
    setDays(out);
  }

  const last = days?.at(-1);
  const final = last ? zTest(last.a, last.b) : null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Baseline conversion rate (%)" value={baselinePct} min={0.1} max={99} step={0.1} onChange={setBaselinePct} />
        <Field label="Smallest lift worth finding (% relative)" value={liftPct} min={1} max={200} step={1} onChange={setLiftPct} />
        <Field label="Visitors per day (both variants)" value={daily} min={1} max={10000000} step={100} onChange={setDaily} />
      </div>
      <div className="flex flex-wrap gap-6">
        <Choice legend="Significance level" value={alpha} options={ALPHAS} onChange={setAlpha} />
        <Choice legend="Power" value={power} options={POWERS} onChange={setPower} />
      </div>

      <div className="rounded-lg border p-3 text-sm" aria-live="polite">
        {problems.length > 0 || !n ? (
          <ul className="flex flex-col gap-1">
            {(problems.length > 0 ? problems : ["These inputs don't give a usable sample size."]).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : (
          <p>
            To find a {liftPct}% relative lift on a {baselinePct}% baseline ({pct(baseline)} → {pct(baseline * (1 + liftPct / 100))}) with {Number(alpha) * 100}% significance
            and {Number(power) * 100}% power, you need <strong>{NUMBER.format(n)} visitors per variant</strong> ({NUMBER.format(2 * n)} in all): about{" "}
            <strong>{plannedDays} days</strong> at {NUMBER.format(daily)} a day.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <Field label="True lift in the simulation (%)" value={trueLiftPct} min={-50} max={200} step={1} onChange={setTrueLiftPct} />
        </div>
        <Button onClick={handleSimulate} disabled={problems.length > 0 || !n}>
          Simulate {plannedDays ? Math.min(plannedDays, MAX_DAYS) : ""} days
        </Button>
      </div>

      {days && final && last ? (
        <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
          <p className="text-xs text-foreground/75">
            Simulation: each day {NUMBER.format(Math.floor(daily / 2))} random visitors per variant convert at {pct(baseline)} (A) and {pct(baseline * (1 + trueLiftPct / 100))} (B).
            {plannedDays && plannedDays > MAX_DAYS ? ` Capped at ${MAX_DAYS} days.` : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["A", "B"] as const).map((v) => {
              const arm = v === "A" ? last.a : last.b;
              const ci = wilson(arm);
              return (
                <p key={v} className="rounded-lg border p-3 text-sm">
                  <span className="font-medium">{v}:</span> {NUMBER.format(arm.conversions)} of {NUMBER.format(arm.visitors)} ={" "}
                  <span className="font-mono">{pct(arm.conversions / arm.visitors)}</span>{" "}
                  <span className="text-foreground/75">
                    (95% interval {pct(ci.low)}–{pct(ci.high)})
                  </span>
                </p>
              );
            })}
          </div>
          <p className="rounded-lg bg-muted/40 p-3 text-sm">
            Difference {final.diff >= 0 ? "+" : ""}
            {pct(final.diff)} (95% interval {pct(final.low)} to {pct(final.high)}). {meaning(final.pValue, Number(alpha), final.diff)}
          </p>
          <div className="relative max-h-64 overflow-auto" role="region" aria-label="Day by day results" tabIndex={0}>
            <table className="w-full min-w-[30rem] text-left text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="py-1 pr-3 font-medium">Day</th>
                  <th className="py-1 pr-3 font-medium">Rate A</th>
                  <th className="py-1 pr-3 font-medium">Rate B</th>
                  <th className="py-1 pr-3 font-medium">Difference</th>
                  <th className="py-1 font-medium">p-value</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const t = zTest(d.a, d.b);
                  return (
                    <tr key={d.day} className="border-b last:border-0">
                      <td className="py-1 pr-3 font-mono">{d.day}</td>
                      <td className="py-1 pr-3 font-mono">{pct(t.pa)}</td>
                      <td className="py-1 pr-3 font-mono">{pct(t.pb)}</td>
                      <td className="py-1 pr-3 font-mono">
                        {t.diff >= 0 ? "+" : ""}
                        {pct(t.diff)}
                      </td>
                      <td className="py-1 font-mono">
                        {t.pValue.toFixed(3)}
                        {t.pValue < Number(alpha) ? " (significant)" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
