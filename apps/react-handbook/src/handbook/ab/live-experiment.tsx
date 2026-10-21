"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { BUCKETS, bucketFor, EXPERIMENT, ID_COOKIE, LIVE_SPLIT, newVisitorId, type Variant, VARIANT_LABEL, variantFor } from "./assign";

export type Assignment = { id: string; bucket: number; variant: Variant; isNew: boolean; forced: boolean };

type Event = { type: "exposure" | "conversion"; variant: Variant; at: string };

const YEAR = 60 * 60 * 24 * 365;

// The cookie jar as a tiny external store: writing notifies, so the page shows
// whether the browser kept the id.
const listeners = new Set<() => void>();

function subscribeCookies(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readCookies() {
  try {
    return document.cookie;
  } catch {
    return "";
  }
}

function writeIdCookie(id: string) {
  try {
    document.cookie = `${ID_COOKIE}=${id}; path=/; max-age=${YEAR}; samesite=lax`;
  } catch {
    // Blocked: the snapshot below shows it isn't there.
  }
  listeners.forEach((listener) => listener());
}

function timeOfDay() {
  return new Date().toISOString().slice(11, 23);
}

/** The visitor's own assignment, as the server made it, and what would change it. */
export function LiveExperiment({ initial }: { initial: Assignment }) {
  const [assignment, setAssignment] = useState(initial);
  // The page was shown with this variant: that's the first exposure. (Listed only after mount, since its time differs from the server's.)
  const [events, setEvents] = useState<Event[]>(() => [{ type: "exposure", variant: initial.variant, at: timeOfDay() }]);
  const [split, setSplit] = useState(LIVE_SPLIT);
  const splitId = useId();
  const cookies = useSyncExternalStore(subscribeCookies, readCookies, () => null);
  const mounted = cookies !== null;
  const stored = mounted ? cookies.includes(`${ID_COOKIE}=${assignment.id}`) : null;

  // Remember a new visitor's id, so the next visit gets the same variant.
  useEffect(() => {
    if (initial.isNew) writeIdCookie(initial.id);
  }, [initial]);

  function handleConvert() {
    setEvents((current) => [...current, { type: "conversion", variant: assignment.variant, at: timeOfDay() }]);
  }

  function handleNewId() {
    const id = newVisitorId();
    const bucket = bucketFor(id);
    const variant = variantFor(bucket);
    writeIdCookie(id);
    setAssignment({ id, bucket, variant, isNew: true, forced: false });
    setEvents((current) => [...current, { type: "exposure", variant, at: timeOfDay() }]);
  }

  const whatIf = variantFor(assignment.bucket, split);
  const shown = mounted ? events : [];
  const exposures = shown.filter((e) => e.type === "exposure").length;
  const conversions = shown.filter((e) => e.type === "conversion").length;
  const moved = Math.abs(split - LIVE_SPLIT);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <h4 className="text-sm font-medium">Your assignment</h4>
          <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-foreground/75">Experiment</dt>
            <dd className="font-mono text-xs">{EXPERIMENT}</dd>
            <dt className="text-foreground/75">Visitor id</dt>
            <dd className="font-mono text-xs break-all">{assignment.id}</dd>
            <dt className="text-foreground/75">Bucket</dt>
            <dd className="font-mono text-xs">
              hash(&quot;{EXPERIMENT}:id&quot;) mod {BUCKETS.toLocaleString("en-US")} = {assignment.bucket}
            </dd>
            <dt className="text-foreground/75">Split</dt>
            <dd className="text-xs">
              buckets 0–{LIVE_SPLIT * 100 - 1} get A, the rest get B
            </dd>
            <dt className="text-foreground/75">Variant</dt>
            <dd className="font-medium">
              {assignment.variant} ({VARIANT_LABEL[assignment.variant]}){assignment.forced ? ", pinned by a test cookie" : ""}
            </dd>
          </dl>
          <p className="text-sm text-foreground/85">
            {initial.isNew && assignment.id === initial.id
              ? "You had no id, so the server made one, chose your variant from it, and rendered this page with it already in place."
              : assignment.id === initial.id
                ? "The server read your id from a cookie and chose the same variant as last time."
                : "New id, new bucket. This page shows the result now; reload and the server will render it from the cookie."}{" "}
            {stored === false ? "Your browser blocked the cookie, so the next visit can't keep this variant." : stored ? "The id is saved in a cookie for a year." : ""}
          </p>
          <div>
            <Button variant="outline" size="sm" onClick={handleNewId}>
              Reset my visitor id
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <h4 className="text-sm font-medium">The product page, as you see it</h4>
          <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
            <p className="font-medium">Walnut desk lamp</p>
            <p className="text-sm text-foreground/75">$89.00 · Warm light, dimmable</p>
            <div>
              {assignment.variant === "A" ? (
                <Button variant="outline" onClick={handleConvert}>
                  Add to cart
                </Button>
              ) : (
                <Button onClick={handleConvert}>Buy now</Button>
              )}
            </div>
          </div>
          <p className="text-xs text-foreground/75">
            {exposures} exposure{exposures === 1 ? "" : "s"}, {conversions} conversion{conversions === 1 ? "" : "s"} for you only. Nothing leaves this page; these are the
            events an analytics call would send:
          </p>
          <ol className="relative flex max-h-40 flex-col gap-1 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[0.6875rem]" tabIndex={0} aria-label="Experiment events" aria-live="polite">
            {(mounted ? events : []).map((e, i) => (
              <li key={i}>{JSON.stringify({ event: e.type, experiment: EXPERIMENT, variant: e.variant, at: e.at })}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-dashed p-3">
        <Label htmlFor={splitId}>What if the split were {split}% A?</Label>
        <input id={splitId} type="range" min={0} max={100} step={5} value={split} onChange={(e) => setSplit(Number(e.target.value))} className="w-full max-w-md accent-primary" />
        <p className="text-sm">
          Your bucket {assignment.bucket} would get <strong>{whatIf}</strong>
          {whatIf === assignment.variant ? " (no change)." : ", so you'd switch variants."}{" "}
          {moved === 0
            ? "At the live split, nobody moves."
            : `Moving the line from ${LIVE_SPLIT}% to ${split}% moves the visitors in ${moved}% of buckets to the other variant; everyone else keeps theirs. Only ever grow a variant's share (ramp up) and never reuse buckets, or people see both versions and the results mix.`}
        </p>
      </div>
    </div>
  );
}
