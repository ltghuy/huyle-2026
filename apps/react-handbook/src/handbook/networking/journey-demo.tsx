"use client";

import { useState } from "react";

import { Toggle } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { journey, type JourneyOptions, type StepKind } from "./journey";

const STEP_CLASS: Record<StepKind, string> = {
  dns: "bg-chart-1",
  tcp: "bg-chart-2",
  tls: "bg-chart-3",
  quic: "bg-chart-4",
  request: "bg-chart-5",
};

const RTTS = [20, 100, 300];

export function JourneyDemo() {
  const [options, setOptions] = useState<JourneyOptions>({ rtt: 100, https: true, tls13: false, http3: false, reuse: false });
  const result = journey(options);
  const scale = Math.max(result.ttfb, 600);

  function handleChange(key: keyof Omit<JourneyOptions, "rtt">, on: boolean) {
    setOptions((current) => ({ ...current, [key]: on, ...(key === "http3" && on ? { https: true, tls13: true } : null) }));
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-2 text-sm font-medium">Round-trip time to the server</legend>
        {RTTS.map((rtt) => (
          <label
            key={rtt}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              options.rtt === rtt ? "border-primary/40 bg-primary/5" : "border-dashed",
            )}
          >
            <input type="radio" name="journey-rtt" checked={options.rtt === rtt} onChange={() => setOptions((o) => ({ ...o, rtt }))} className="size-4 accent-primary" />
            {rtt} ms {rtt === 20 ? "(same city)" : rtt === 100 ? "(another continent)" : "(mobile, far away)"}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Toggle checked={options.https} onCheckedChange={(on) => handleChange("https", on)} title="HTTPS" detail={options.http3 ? "HTTP/3 always encrypts" : "Adds a TLS handshake"} />
        <Toggle checked={options.tls13} onCheckedChange={(on) => handleChange("tls13", on)} title="TLS 1.3" detail="1 round trip instead of 2" />
        <Toggle checked={options.http3} onCheckedChange={(on) => handleChange("http3", on)} title="HTTP/3 (QUIC)" detail="Transport and TLS in one round trip" />
        <Toggle checked={options.reuse} onCheckedChange={(on) => handleChange("reuse", on)} title="Reuse an open connection" detail="Later requests to the same server" />
      </div>

      <div aria-live="polite" className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Round trips</p>
          <p className="font-mono text-lg font-semibold tabular-nums">{result.roundTrips}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Time to first byte</p>
          <p className="font-mono text-lg font-semibold tabular-nums">{result.ttfb} ms</p>
        </div>
      </div>

      <figure className="flex flex-col gap-2">
        <figcaption className="text-xs font-medium">Simulated timeline</figcaption>
        <ol className="flex flex-col gap-2">
          {result.steps.map((step) => (
            <li key={step.kind} className="flex flex-col gap-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-medium">{step.label}</span>
                <span className="font-mono text-xs text-foreground/75 tabular-nums">
                  {step.roundTrips} RTT · {step.start}–{step.end} ms
                </span>
              </p>
              <div aria-hidden className="relative h-3 rounded-sm bg-muted/60">
                <span
                  className={cn("absolute inset-y-0 rounded-sm motion-safe:transition-[left,width] motion-safe:duration-300", STEP_CLASS[step.kind])}
                  style={{ left: `${(step.start / scale) * 100}%`, width: `${((step.end - step.start) / scale) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{step.note}</p>
            </li>
          ))}
        </ol>
      </figure>
    </div>
  );
}
