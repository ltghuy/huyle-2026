"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Verdict } from "@/handbook/ui";

import { sampleRatioTest } from "./stats";

// Sample ratio mismatch: did the variants get the share of visitors they were meant to?

const THRESHOLD = 0.001;
const NUMBER = new Intl.NumberFormat("en-US");

const CAUSES = [
  "One variant crashes, loads slower or redirects, so fewer of its visitors are counted.",
  "Bots or internal traffic land unevenly, or are filtered out of one variant only.",
  "Visitors are assigned after a filter that the variant itself affects (for example, only people who scroll to the button).",
  "Exposure is logged in different places for each variant, or one variant's events fail to send.",
  "The split or the bucketing changed during the test.",
];

function Field({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = useId();
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(Number(event.target.value));
  }
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="numeric" min={min} max={max} value={Number.isFinite(value) ? value : ""} onChange={handleChange} />
    </div>
  );
}

export function SrmDemo() {
  const [a, setA] = useState(10400);
  const [b, setB] = useState(9600);
  const [shareA, setShareA] = useState(50);

  const valid = a >= 0 && b >= 0 && a + b > 0 && shareA > 0 && shareA < 100 && Number.isInteger(a) && Number.isInteger(b);
  const test = valid ? sampleRatioTest([a, b], [shareA, 100 - shareA]) : null;
  const mismatch = test ? test.pValue < THRESHOLD : false;
  const observed = valid ? (a / (a + b)) * 100 : 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <Field label="Visitors counted in A" value={a} min={0} max={100000000} onChange={setA} />
        <Field label="Visitors counted in B" value={b} min={0} max={100000000} onChange={setB} />
        <Field label="Intended share for A (%)" value={shareA} min={1} max={99} onChange={setShareA} />
      </div>
      <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
        {!test ? (
          <p>Enter whole, non-negative visitor counts and a share between 1% and 99%.</p>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-x-2">
              <Verdict pass={!mismatch}>{mismatch ? "Sample ratio mismatch" : "Split looks as intended"}</Verdict>
              <span>
                A got {observed.toFixed(2)}% of {NUMBER.format(a + b)} visitors against {shareA}% intended (chi-square {test.chi.toFixed(2)}, p ={" "}
                {test.pValue < 1e-6 ? test.pValue.toExponential(1) : test.pValue.toFixed(4)}).
              </span>
            </p>
            <p className="text-foreground/85">
              {mismatch
                ? `A gap this large would happen by chance less than once in ${NUMBER.format(Math.round(1 / Math.max(test.pValue, 1e-12)))} tests. Don't read the results: something is losing or adding visitors in one variant. Look for:`
                : `A gap like this is normal chance. A check at p < ${THRESHOLD} keeps false alarms rare while still catching real breakage on large tests.`}
            </p>
            {mismatch ? (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-foreground/85">
                {CAUSES.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
