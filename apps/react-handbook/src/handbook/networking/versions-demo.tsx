"use client";

import { useState, useSyncExternalStore } from "react";

import { Toggle } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { FILE_COUNT, loadFiles, type Version } from "./versions";

const VERSIONS: { id: Version; title: string; detail: string }[] = [
  { id: "http1", title: "HTTP/1.1", detail: "6 connections, one file at a time each" },
  { id: "http2", title: "HTTP/2", detail: "1 TCP connection, all files at once" },
  { id: "http3", title: "HTTP/3", detail: "1 QUIC connection, independent streams" },
];

const RTT = 100;

export function VersionsDemo() {
  const [version, setVersion] = useState<Version>("http1");
  const [loss, setLoss] = useState(false);
  const result = loadFiles(version, loss);
  const scale = 5;
  const pct = (rtts: number) => `${(rtts / scale) * 100}%`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-4">
        {VERSIONS.map((option) => (
          <label
            key={option.id}
            className={cn(
              "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              version === option.id ? "border-primary/40 bg-primary/5" : "border-dashed",
            )}
          >
            <input type="radio" name="versions" checked={version === option.id} onChange={() => setVersion(option.id)} className="mt-0.5 size-4 shrink-0 accent-primary" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{option.title}</span>
              <span className="text-xs text-foreground/75">{option.detail}</span>
            </span>
          </label>
        ))}
        <Toggle checked={loss} onCheckedChange={setLoss} title="Lose one packet" detail="Of file 3, in its first round trip" />
      </div>

      <div aria-live="polite" className="grid grid-cols-3 gap-2">
        <Stat label="Connections" value={String(result.connections)} />
        <Stat label="First file done" value={`${result.firstDone * RTT} ms`} />
        <Stat label={`All ${FILE_COUNT} files`} value={`${result.allDone * RTT} ms`} />
      </div>

      <figure className="flex flex-col gap-2">
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Simulated waterfall ({RTT} ms round trips)</span>
          <Legend className="bg-muted-foreground/35">Connection setup</Legend>
          <Legend className="bg-primary/70">Download</Legend>
          <Legend className="bg-destructive">Waiting for a resent packet</Legend>
        </figcaption>
        <ol className="flex flex-col gap-1">
          {result.files.map((file) => (
            <li key={file.file} className="grid grid-cols-[4.5rem_1fr] items-center gap-2 text-xs">
              <span className="font-mono text-foreground/75">
                file {file.file + 1}
                {version === "http1" ? ` · c${file.connection + 1}` : ""}
              </span>
              <span className="sr-only">
                {file.setup ? `connection setup until ${file.setup[1] * RTT} ms, ` : ""}
                downloaded {file.start * RTT}–{file.end * RTT} ms{file.stalled ? ", stalled by a lost packet" : ""}.
              </span>
              <div aria-hidden className="relative h-3 rounded-sm bg-muted/60">
                {file.setup ? (
                  <span className="absolute inset-y-0 rounded-sm bg-muted-foreground/35" style={{ left: pct(file.setup[0]), width: pct(file.setup[1] - file.setup[0]) }} />
                ) : null}
                <span className="absolute inset-y-0 rounded-sm bg-primary/70" style={{ left: pct(file.start), width: pct(1) }} />
                {file.stalled ? <span className="absolute inset-y-0 rounded-sm bg-destructive" style={{ left: pct(file.start + 1), width: pct(1) }} /> : null}
              </div>
            </li>
          ))}
        </ol>
        <p aria-hidden className="ml-[5rem] flex justify-between font-mono text-[0.6875rem] text-muted-foreground">
          <span>0</span>
          <span>{(scale * RTT) / 2} ms</span>
          <span>{scale * RTT} ms</span>
        </p>
      </figure>

      <RealProtocols />
    </div>
  );
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("inline-block h-2.5 w-5 rounded-sm", className)} />
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function subscribeResources(onChange: () => void) {
  if (typeof PerformanceObserver === "undefined") return () => {};
  const observer = new PerformanceObserver(onChange);
  observer.observe({ type: "resource" });
  return () => observer.disconnect();
}

/** This page and its files, grouped by the protocol they really came over. */
function readProtocols() {
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const counts: Record<string, number> = {};
  for (const entry of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
    const protocol = entry.nextHopProtocol || "unknown (cross-origin or cached)";
    counts[protocol] = (counts[protocol] ?? 0) + 1;
  }
  return JSON.stringify({ page: navigation?.nextHopProtocol || "unknown", counts });
}

function RealProtocols() {
  const snapshot = useSyncExternalStore(subscribeResources, readProtocols, () => "");
  const data = snapshot ? (JSON.parse(snapshot) as { page: string; counts: Record<string, number> }) : null;
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
      <p className="text-xs font-medium text-foreground/75">Measured: how this page really arrived (from the browser)</p>
      {data ? (
        <>
          <p>
            This page: <span className="font-mono font-medium">{data.page}</span>
          </p>
          <p className="text-xs text-foreground/85">
            Its files:{" "}
            {Object.entries(data.counts)
              .map(([protocol, count]) => `${count} over ${protocol}`)
              .join(", ") || "none yet"}
            . <span className="font-mono">h2</span> is HTTP/2, <span className="font-mono">h3</span> HTTP/3; a local server usually speaks{" "}
            <span className="font-mono">http/1.1</span>.
          </p>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Reading…</p>
      )}
    </div>
  );
}
