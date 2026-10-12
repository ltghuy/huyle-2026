"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle, Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { latencyFor, normalize, search } from "./search-sim";

type LogEntry = { id: number; query: string; latency: number; status: "applied" | "dropped" | "cache" };
type Displayed = { query: string; results: string[] };

const BURST = ["r", "re", "rea", "reac", "react"];
const DEBOUNCE_MS = 300;

export function LifecycleDemo() {
  const [debounce, setDebounce] = useState(true);
  const [guard, setGuard] = useState(true);
  const [input, setInput] = useState("");
  const [displayed, setDisplayed] = useState<Displayed | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [requests, setRequests] = useState(0);

  const idRef = useRef(0);
  const latestRef = useRef(0);
  const runRef = useRef(0); // invalidates pending timers from a previous burst/typing
  const cacheRef = useRef<Map<string, string[]>>(new Map());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const debounceTimerRef = debounceTimer;
    const timersRef = timers;
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  function clearAllTimers() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function resetState() {
    clearAllTimers();
    runRef.current += 1;
    idRef.current = 0;
    latestRef.current = 0;
    cacheRef.current = new Map();
    setLog([]);
    setRequests(0);
    setDisplayed(null);
  }

  function addLog(entry: LogEntry) {
    setLog((l) => [...l, entry]);
  }

  // Issue one query against the simulated backend.
  function issue(query: string, run: number) {
    const key = normalize(query);
    if (key === "") return;
    const id = ++idRef.current;
    latestRef.current = id;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setDisplayed({ query: key, results: cached });
      addLog({ id, query: key, latency: 0, status: "cache" });
      return;
    }
    const latency = latencyFor(query);
    setRequests((n) => n + 1);
    const timer = setTimeout(() => {
      if (run !== runRef.current) return; // belongs to a superseded run
      const results = search(key);
      cacheRef.current.set(key, results);
      if (guard && id !== latestRef.current) {
        addLog({ id, query: key, latency, status: "dropped" });
        return;
      }
      setDisplayed({ query: key, results });
      addLog({ id, query: key, latency, status: "applied" });
    }, latency);
    timers.current.push(timer);
  }

  function handleInput(value: string) {
    setInput(value);
    const run = runRef.current;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (normalize(value) === "") {
      setDisplayed(null);
      return;
    }
    if (debounce) {
      debounceTimer.current = setTimeout(() => issue(value, run), DEBOUNCE_MS);
    } else {
      issue(value, run);
    }
  }

  // Replay a fast burst that deterministically forces an out-of-order arrival:
  // the final query resolves first, earlier ones later, so a naive handler ends
  // on stale results.
  function handleBurst() {
    resetState();
    const run = runRef.current;
    setInput("react");
    BURST.forEach((q, i) => {
      const t = setTimeout(() => {
        if (run === runRef.current) issue(q, run);
      }, i * 120);
      timers.current.push(t);
    });
  }

  const current = normalize(input);
  const stale = displayed !== null && displayed.query !== current && current !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle checked={debounce} onCheckedChange={setDebounce} title="Debounce input" detail={`Wait ${DEBOUNCE_MS}ms after the last keystroke.`} />
        <Toggle checked={guard} onCheckedChange={setGuard} title="Drop out-of-order responses" detail="Only the latest query may update the results." />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ac-lifecycle-input" className="text-xs text-foreground/75">
          Type a query (try &quot;react&quot;), or replay a fast burst
        </Label>
        <div className="flex flex-wrap gap-2">
          <Input id="ac-lifecycle-input" value={input} onChange={(e) => handleInput(e.target.value)} placeholder="search…" className="max-w-xs" autoComplete="off" spellCheck={false} />
          <Button variant="outline" onClick={handleBurst}>
            Replay fast burst
          </Button>
          <Button variant="ghost" onClick={resetState}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Displayed results" className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
          <p className="text-xs font-medium text-foreground/75">
            Showing results for: <span className="font-mono">{displayed ? displayed.query || "—" : "—"}</span>
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {displayed && displayed.results.length > 0 ? (
              displayed.results.map((r) => (
                <li key={r} className="font-mono">
                  {r}
                </li>
              ))
            ) : (
              <li className="text-foreground/60">no results</li>
            )}
          </ul>
          <div aria-live="polite">
            {stale ? (
              <Verdict pass={false}>
                Stale: you typed &quot;{current}&quot; but the results are for &quot;{displayed?.query}&quot;.
              </Verdict>
            ) : displayed && current !== "" ? (
              <Verdict pass>Results match the current query.</Verdict>
            ) : null}
          </div>
        </section>

        <section aria-label="Request log" className="flex min-w-0 flex-col gap-1 rounded-lg border bg-muted/40 p-3">
          <p className="flex items-center justify-between text-xs font-medium text-foreground/75">
            <span>Request log</span>
            <span className="font-mono">{requests} request(s)</span>
          </p>
          <ol className="flex flex-col gap-0.5 font-mono text-xs">
            {log.length === 0 ? <li className="text-foreground/60">nothing yet</li> : null}
            {log.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-2">
                <span className="text-foreground/60">#{e.id}</span>
                <span>{e.query}</span>
                <span className="text-foreground/60">{e.status === "cache" ? "cache hit" : `${e.latency}ms`}</span>
                <span
                  className={cn(
                    "font-sans font-medium",
                    e.status === "applied" && "text-success",
                    e.status === "dropped" && "text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning",
                    e.status === "cache" && "text-info",
                  )}
                >
                  {e.status === "applied" ? "applied" : e.status === "dropped" ? "dropped (stale)" : "no request"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <p className="text-xs text-foreground/75">
        Simulated backend over a local word list. With the guard off, the burst ends on an earlier query&apos;s results because it resolves last; with it on, only the latest
        query wins. Debounce cuts the request count; a repeat query is served from cache with no request.
      </p>
    </div>
  );
}
