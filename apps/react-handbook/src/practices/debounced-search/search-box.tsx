"use client";

import { Check, Database, LoaderCircle, RefreshCw, Search, TriangleAlert, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  MAX_QUERY_LENGTH,
  type Product,
  type SearchResult,
} from "@/server/practices/debounced-search/search.schema";

import { HighlightText } from "./highlight-text";
import { isMismatch, type SearchEngine, type SearchSnapshot } from "./search-engine";
import { useNow, wallNow } from "./use-search";

export const EXAMPLE_QUERIES = ["desk lamp", "café", "walnut", "wool rug"];

export const PRICE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const SKELETON_ROWS = [0, 1, 2, 3, 4];

/** What the polite status region says once a search has settled. */
function statusMessage(s: SearchSnapshot) {
  if (s.waiting || s.loading || s.tooShort) return "";
  if (s.error) return `Search failed: ${s.error.message}`;
  if (!s.shown) return "";
  const { total, items } = s.shown.result;
  if (total === 0) return `No products match ${s.shown.key}`;
  return `${items.length} of ${total} results for ${s.shown.key}`;
}

function ageLabel(cachedAt: number, now: number) {
  const seconds = Math.max(0, Math.round((now - cachedAt) / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min`;
}

export function SearchBox({
  engine,
  snapshot,
  pickedId,
  onPick,
  onUserInput,
}: {
  engine: SearchEngine;
  snapshot: SearchSnapshot;
  pickedId: string | null;
  onPick: (product: Product) => void;
  /** Real typing (or a key the user pressed) stops the typing robot. */
  onUserInput: () => void;
}) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const hintId = `${id}-hint`;
  const optionId = (index: number) => `${id}-option-${index}`;
  // Escape hides the list until the text changes.
  const [closedFor, setClosedFor] = useState<string | null>(null);
  // The highlighted option belongs to one result object; new results reset it.
  const [active, setActive] = useState<{ result: SearchResult | null; index: number }>({
    result: null,
    index: -1,
  });

  const { shown, waiting, loading, error, tooShort } = snapshot;
  const items = shown && !tooShort ? shown.result.items : [];
  const open = closedFor !== snapshot.input && items.length > 0;
  const activeIndex = open && active.result === shown?.result ? active.index : -1;
  const mismatch = isMismatch(snapshot);
  const now = useNow(wallNow, shown?.source === "cache", 1000);

  useEffect(() => {
    if (activeIndex >= 0) document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, id]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onUserInput();
    engine.setInput(event.target.value);
  }

  function move(delta: 1 | -1) {
    if (!shown || items.length === 0) return;
    setClosedFor(null);
    const next =
      activeIndex === -1
        ? delta === 1 ? 0 : items.length - 1
        : (activeIndex + delta + items.length) % items.length;
    setActive({ result: shown.result, index: next });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        move(event.key === "ArrowDown" ? 1 : -1);
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0) onPick(items[activeIndex]);
        else {
          onUserInput();
          engine.submit();
        }
        break;
      case "Escape":
        event.preventDefault();
        if (open) setClosedFor(snapshot.input);
        else if (snapshot.input) {
          onUserInput();
          engine.setInput("");
        }
        break;
    }
  }

  function handleClear() {
    onUserInput();
    engine.setInput("");
    document.getElementById(`${id}-input`)?.focus();
  }

  function handleExample(query: string) {
    onUserInput();
    engine.setInput(query);
    engine.submit();
    document.getElementById(`${id}-input`)?.focus();
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-input`} className="text-sm font-medium">
          Search products
        </label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id={`${id}-input`}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-describedby={hintId}
            autoComplete="off"
            spellCheck={false}
            maxLength={MAX_QUERY_LENGTH}
            value={snapshot.input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Try “desk lamp”"
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent pr-20 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1">
            {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin text-muted-foreground" /> : null}
            {snapshot.input ? (
              <Button type="button" variant="ghost" size="icon" aria-label="Clear search" onClick={handleClear}>
                <X aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>
        <WaitingBar waiting={waiting} />
        <p id={hintId} className="text-xs text-muted-foreground">
          {snapshot.options.debounce && snapshot.options.debounceMs > 0
            ? `Searches ${snapshot.options.debounceMs} ms after you stop typing; Enter searches now. `
            : "Searches on every change; Enter searches now. "}
          Arrow keys move through results, Enter picks, Escape closes.
        </p>
      </div>

      <p role="status" className="sr-only">
        {statusMessage(snapshot)}
      </p>

      {mismatch && shown ? (
        <div className="flex gap-2 rounded-lg border border-warning/60 bg-warning/15 p-3 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong className="font-medium">Stale results.</strong> The list shows results for “{shown.key}”, but the
            box says “{snapshot.key}”: an older response arrived last and overwrote the newer one. Turn the
            stale-response guard (or abort) back on.
          </p>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-destructive/10 p-3 text-sm">
          <TriangleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
          <p className="min-w-0 flex-1">
            <span className="font-medium">Search for “{error.key}” failed.</span> {error.message}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => engine.retry()}>
            <RefreshCw aria-hidden /> Retry
          </Button>
        </div>
      ) : null}

      {tooShort ? (
        <IdleHint minLength={snapshot.options.minLength} onExample={handleExample} />
      ) : shown ? (
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {shown.result.total === 0
                ? "0 results"
                : `${shown.result.items.length} of ${shown.result.total} results`}{" "}
              for <span className="font-medium text-foreground">“{shown.key}”</span>
            </span>
            {shown.source === "cache" && shown.cachedAt !== null ? (
              <Badge>
                <Database aria-hidden className="size-3" />
                Cached {ageLabel(shown.cachedAt, now)} ago{shown.refreshing ? " · refreshing…" : ""}
              </Badge>
            ) : null}
            {loading && !shown.refreshing ? (
              <Badge>
                <LoaderCircle aria-hidden className="size-3 animate-spin" /> Updating…
              </Badge>
            ) : null}
          </div>
          {shown.result.total === 0 ? (
            <EmptyState query={shown.key} onExample={handleExample} />
          ) : open ? (
            <ul
              id={listboxId}
              role="listbox"
              aria-label={`Results for ${shown.key}`}
              className={cn(
                "relative max-h-[22rem] overflow-y-auto rounded-lg border p-1 motion-safe:transition-opacity",
                loading && !shown.refreshing && "opacity-60",
              )}
            >
              {items.map((product, index) => (
                <li
                  key={product.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerEnter={() => setActive({ result: shown.result, index })}
                  onClick={() => onPick(product)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm",
                    index === activeIndex && "border-primary bg-accent text-accent-foreground",
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">
                      <HighlightText text={product.name} query={shown.key} />
                    </span>
                    <span className="truncate text-xs text-foreground/75">
                      <HighlightText text={product.category} query={shown.key} />
                    </span>
                  </span>
                  {product.id === pickedId ? (
                    <Check aria-label="Picked" className="size-4 shrink-0 text-success" />
                  ) : null}
                  <span className="shrink-0 tabular-nums">{PRICE.format(product.price / 100)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              Results hidden. Press ↓ to show them again.
            </p>
          )}
        </div>
      ) : loading || waiting ? (
        <div aria-hidden className="flex flex-col gap-2 rounded-lg border p-2">
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-10" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WaitingBar({ waiting }: { waiting: SearchSnapshot["waiting"] }) {
  return (
    <div className="flex h-4 items-center gap-2 text-xs text-muted-foreground">
      {waiting ? (
        <>
          <div className="h-0.5 w-24 overflow-hidden rounded-full bg-muted">
            <div key={waiting.startedAt} ref={animateShrink(waiting.delayMs)} className="h-full origin-left bg-primary" />
          </div>
          <span>Waiting for a pause… ({waiting.delayMs} ms)</span>
        </>
      ) : null}
    </div>
  );
}

/** A bar that empties over the debounce delay (static under reduced motion). */
function animateShrink(durationMs: number) {
  return (el: HTMLDivElement | null) => {
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
      duration: durationMs,
      fill: "forwards",
    });
  };
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs text-foreground/75">
      {children}
    </span>
  );
}

function ExampleButtons({ onExample }: { onExample: (query: string) => void }) {
  return (
    <span className="flex flex-wrap gap-2">
      {EXAMPLE_QUERIES.map((query) => (
        <Button key={query} type="button" variant="outline" size="sm" onClick={() => onExample(query)}>
          {query}
        </Button>
      ))}
    </span>
  );
}

function IdleHint({ minLength, onExample }: { minLength: number; onExample: (query: string) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      <p>
        Type at least {minLength} character{minLength === 1 ? "" : "s"} to search 5,616 products, or try one of
        these:
      </p>
      <ExampleButtons onExample={onExample} />
    </div>
  );
}

function EmptyState({ query, onExample }: { query: string; onExample: (query: string) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      <p>
        No products match <span className="font-medium text-foreground">“{query}”</span>. Every word must start a
        word in the name or category. Try:
      </p>
      <ExampleButtons onExample={onExample} />
    </div>
  );
}
