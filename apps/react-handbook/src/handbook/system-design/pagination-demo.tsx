"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { classify, cursorPage, type FeedPost, makeFeed, offsetPage, prepend } from "./pagination";

type Mode = "offset" | "cursor";
const MODE_OPTIONS = [
  { value: "offset" as const, label: "Offset / page" },
  { value: "cursor" as const, label: "Cursor" },
];
const PAGE_SIZE = 4;
const INITIAL = 16;

type Row = { post: FeedPost; duplicate: boolean };

export function PaginationDemo() {
  const [mode, setMode] = useState<Mode>("offset");
  const [feed, setFeed] = useState(() => makeFeed(INITIAL));
  const [pageIndex, setPageIndex] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [loaded, setLoaded] = useState<Row[][]>([]);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());

  function reset(nextMode: Mode) {
    setMode(nextMode);
    setFeed(makeFeed(INITIAL));
    setPageIndex(0);
    setCursor(null);
    setExhausted(false);
    setLoaded([]);
    setSeen(new Set());
  }

  function handleArrive() {
    setFeed((current) => prepend(current, 2));
  }

  function handleNext() {
    if (mode === "offset") {
      const items = offsetPage(feed, pageIndex, PAGE_SIZE);
      if (items.length === 0) {
        setExhausted(true);
        return;
      }
      const rows = classify(items, seen);
      setLoaded((l) => [...l, rows]);
      setSeen((s) => new Set([...s, ...items.map((p) => p.id)]));
      setPageIndex((i) => i + 1);
    } else {
      const { items, nextCursor } = cursorPage(feed, cursor, PAGE_SIZE);
      if (items.length === 0) {
        setExhausted(true);
        return;
      }
      const rows = classify(items, seen);
      setLoaded((l) => [...l, rows]);
      setSeen((s) => new Set([...s, ...items.map((p) => p.id)]));
      setCursor(nextCursor);
      if (nextCursor === null) setExhausted(true);
    }
  }

  const dupCount = loaded.flat().filter((r) => r.duplicate).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Choice legend="Pagination" value={mode} options={MODE_OPTIONS} onChange={(v) => reset(v)} />
        <p className="text-xs text-foreground/75">Page size {PAGE_SIZE}. Newest posts have the highest numbers.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleNext} disabled={exhausted}>
          {exhausted ? "No more pages" : loaded.length === 0 ? "Load first page" : "Load next page"}
        </Button>
        <Button variant="outline" onClick={handleArrive}>
          2 new posts arrive at the top
        </Button>
        <Button variant="ghost" onClick={() => reset(mode)}>
          Reset
        </Button>
      </div>

      {loaded.length === 0 ? (
        <p className="text-sm text-foreground/75">Load the first page, then make new posts arrive before loading the next.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {loaded.map((rows, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p className="text-xs font-medium text-foreground/75">Page {i + 1}</p>
              <ul className="flex flex-wrap gap-2">
                {rows.map((row) => (
                  <li
                    key={row.post.id}
                    className={cn(
                      "rounded-md border px-2.5 py-1 font-mono text-xs",
                      row.duplicate ? "border-destructive/50 bg-destructive/10 text-[color-mix(in_oklch,var(--destructive),black_30%)] dark:text-destructive" : "bg-card",
                    )}
                  >
                    {row.post.label}
                    {row.duplicate ? " · seen again" : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div aria-live="polite" className="rounded-lg border bg-muted/40 p-3 text-sm">
        {mode === "offset" ? (
          <p>
            Offset counts from the start, so when posts arrive at the top the window shifts: {dupCount > 0 ? <strong>you&apos;ve now seen {dupCount} post(s) twice.</strong> : "load a page, let posts arrive, then load the next to see a post repeat."} Trade-off: offset lets you jump to any page, but it drifts under inserts and gets slow at deep offsets.
          </p>
        ) : (
          <p>
            A cursor points at the last post you saw, so new posts at the top don&apos;t disturb it: {dupCount === 0 && loaded.length > 1 ? <strong>no duplicates, even after posts arrived.</strong> : "pages stay contiguous even as posts arrive."} Trade-off: stable and efficient, but you can&apos;t jump straight to an arbitrary page.
          </p>
        )}
      </div>
    </div>
  );
}
