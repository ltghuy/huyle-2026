"use client";

import { SearchX, TriangleAlert } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { FaqEntry } from "@/server/practices/searchable-accordion/faq.schema";

import { AccordionSection } from "./accordion-section";
import type { AccordionAction, AccordionState } from "./accordion-state";
import {
  indexEntries,
  matchEntry,
  MAX_QUERY_LENGTH,
  parseQuery,
  type Match,
} from "./search";

export type FaqLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; entries: FaqEntry[] };

type Visible = { entry: FaqEntry; match: Match; matchKey: string };

const ANNOUNCE_DELAY_MS = 500;
const NAVIGATION_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

function matchKeyOf(match: Match) {
  return `${match.questionRanges.join(";")}|${match.answerRanges.join(";")}`;
}

function groupByCategory(visible: Visible[]) {
  const groups = new Map<string, Visible[]>();
  for (const item of visible) {
    const list = groups.get(item.entry.category);
    if (list) list.push(item);
    else groups.set(item.entry.category, [item]);
  }
  return [...groups];
}

function triggersIn(root: HTMLElement | null) {
  return [...(root?.querySelectorAll<HTMLElement>("[data-accordion-trigger]") ?? [])];
}

export function FaqAccordion({
  load,
  query,
  onQueryChange,
  state,
  dispatch,
  onRetry,
}: {
  load: FaqLoad;
  query: string;
  onQueryChange: (query: string) => void;
  state: AccordionState;
  dispatch: React.Dispatch<AccordionAction>;
  onRetry: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const announceRef = useRef<HTMLParagraphElement>(null);
  const deferredQuery = useDeferredValue(query);

  const entries = load.status === "ready" ? load.entries : null;
  const index = useMemo(() => (entries ? indexEntries(entries) : []), [entries]);

  const words = useMemo(() => parseQuery(deferredQuery), [deferredQuery]);
  const visible = useMemo(() => {
    const result: Visible[] = [];
    for (const ix of index) {
      const match = matchEntry(ix, words);
      if (match) result.push({ entry: ix.entry, match, matchKey: matchKeyOf(match) });
    }
    return result;
  }, [index, words]);

  const searching = words.length > 0;
  const openSet = new Set(state.open);
  const visibleIds = visible.map((v) => v.entry.id);
  const openVisible = visibleIds.filter((id) => openSet.has(id)).length;
  const countText = `${visible.length} of ${index.length} sections match`;

  // Announce the count once typing pauses, not on every keystroke.
  useEffect(() => {
    if (!entries) return;
    const handle = window.setTimeout(() => {
      if (announceRef.current) announceRef.current.textContent = searching ? countText : "";
    }, ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [entries, searching, countText]);

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && query) {
      event.preventDefault();
      onQueryChange("");
    } else if (event.key === "ArrowDown") {
      const first = triggersIn(rootRef.current)[0];
      if (first) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function handleListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!NAVIGATION_KEYS.has(event.key) || !target.hasAttribute("data-accordion-trigger")) {
      return;
    }
    const triggers = triggersIn(rootRef.current);
    const at = triggers.indexOf(target);
    const last = triggers.length - 1;
    const next =
      event.key === "Home" ? 0
      : event.key === "End" ? last
      : event.key === "ArrowDown" ? (at === last ? 0 : at + 1)
      : at === 0 ? last : at - 1;
    event.preventDefault();
    triggers[next]?.focus();
  }

  function handleExpandAll() {
    dispatch({ type: "expand", ids: visibleIds });
  }

  function handleCollapseAll() {
    dispatch({ type: "collapse", ids: visibleIds });
  }

  function handleClear() {
    onQueryChange("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="faq-search" className="sr-only">
          Search questions and answers
        </label>
        <Input
          ref={inputRef}
          id="faq-search"
          type="search"
          placeholder="Search questions and answers…"
          autoComplete="off"
          maxLength={MAX_QUERY_LENGTH}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="sm:max-w-sm"
        />
        {state.mode === "multiple" && entries ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={visible.length === 0 || openVisible === visible.length}
              onClick={handleExpandAll}
            >
              Expand all
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={openVisible === 0}
              onClick={handleCollapseAll}
            >
              Collapse all
            </Button>
          </div>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground" aria-hidden={!searching}>
        {entries && searching ? countText : " "}
      </p>
      <p ref={announceRef} role="status" className="sr-only" />

      {load.status === "loading" ? (
        <div aria-busy="true" aria-label="Loading questions" className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : load.status === "error" ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg bg-destructive/5 p-4">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <TriangleAlert aria-hidden className="size-4" />
            Couldn&apos;t load the questions
          </p>
          <p className="text-sm text-muted-foreground">{load.message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : index.length === 0 ? (
        <p className="text-sm text-muted-foreground">No questions yet.</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-6">
          <SearchX aria-hidden className="size-5 text-muted-foreground" />
          <p className="font-medium break-all">No results for “{deferredQuery.trim()}”</p>
          <p className="text-sm text-muted-foreground">Try fewer or different words.</p>
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear search
          </Button>
        </div>
      ) : (
        <div ref={rootRef} onKeyDown={handleListKeyDown} className="flex flex-col gap-6">
          {groupByCategory(visible).map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-1 flex items-baseline gap-2 text-sm font-semibold">
                {category}
                <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">
                  <span className="sr-only"> (</span>
                  {items.length}
                  <span className="sr-only"> {items.length === 1 ? "question" : "questions"})</span>
                </span>
              </h2>
              <div className="rounded-lg border">
                {items.map(({ entry, match, matchKey }) => (
                  <AccordionSection
                    key={entry.id}
                    entry={entry}
                    open={openSet.has(entry.id)}
                    match={match}
                    matchKey={matchKey}
                    dispatch={dispatch}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
