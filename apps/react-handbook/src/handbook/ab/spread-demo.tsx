"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";

import { bucketFor, LIVE_SPLIT, newVisitorId, variantFor } from "./assign";

// Assign many generated ids with the live method and see how evenly they spread.

const SIZES = [
  { value: "1000", label: "1,000" },
  { value: "10000", label: "10,000" },
  { value: "100000", label: "100,000" },
] as const;

type Result = { n: number; a: number; deciles: number[] };

function assignMany(n: number): Result {
  let a = 0;
  const deciles = Array.from({ length: 10 }, () => 0);
  for (let i = 0; i < n; i++) {
    const bucket = bucketFor(newVisitorId());
    deciles[Math.floor(bucket / 1000)]++;
    if (variantFor(bucket) === "A") a++;
  }
  return { n, a, deciles };
}

const NUMBER = new Intl.NumberFormat("en-US");

export function SpreadDemo() {
  const [size, setSize] = useState<(typeof SIZES)[number]["value"]>("10000");
  const [result, setResult] = useState<Result | null>(null);

  function handleRun() {
    setResult(assignMany(Number(size)));
  }

  const shareA = result ? (result.a / result.n) * 100 : 0;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Choice legend="Generated visitor ids" value={size} options={SIZES} onChange={setSize} />
        <Button onClick={handleRun}>Assign them</Button>
      </div>
      {result ? (
        <div className="flex min-w-0 flex-col gap-3" aria-live="polite">
          <p className="text-sm">
            {NUMBER.format(result.a)} in A ({shareA.toFixed(2)}%), {NUMBER.format(result.n - result.a)} in B ({(100 - shareA).toFixed(2)}%), against a {LIVE_SPLIT}/
            {100 - LIVE_SPLIT} target: {Math.abs(shareA - LIVE_SPLIT).toFixed(2)} percentage points off, from the hash alone, with no list of visitors anywhere.
          </p>
          <div className="relative overflow-x-auto" role="region" aria-label="Ids per tenth of the buckets" tabIndex={0}>
            <table className="w-full min-w-[32rem] text-left text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-1 pr-2 font-medium">Buckets</th>
                  {result.deciles.map((_, i) => (
                    <th key={i} className="py-1 pr-2 font-mono font-medium">
                      {i * 1000}–{i * 1000 + 999}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1 pr-2">Ids</td>
                  {result.deciles.map((count, i) => (
                    <td key={i} className="py-1 pr-2 font-mono tabular-nums">
                      {NUMBER.format(count)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/75">Generate random ids and assign each one exactly as the live experiment does.</p>
      )}
    </div>
  );
}
