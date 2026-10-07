"use client";

import { FilterX } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { indexIn, type ListApi, type SharedAnchor } from "./list-navigation";
import { markUpdate } from "./list-stats";
import { NaiveList } from "./naive-list";
import { StatsBar } from "./stats-bar";
import { TicketDetails } from "./ticket-details";
import { numberFormat } from "./ticket-row";
import { ticketStore, useTicketProgress } from "./tickets";
import { Toolbar } from "./toolbar";
import { buildView, positionsOf, type Sort } from "./view";
import { VirtualList } from "./virtual-list";

export type Mode = "virtual" | "naive";

const NO_KEYS = new Int32Array(0);

export function TicketBrowser({
  count, mode, estimate, overscan, debug,
}: {
  count: number;
  mode: Mode;
  estimate: number;
  overscan: number;
  debug: boolean;
}) {
  const progress = useTicketProgress();
  const ready = progress.generated >= count;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("oldest");
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [listCount, setListCount] = useState(count);
  const anchorRef = useRef<SharedAnchor | null>(null);
  const apiRef = useRef<ListApi | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const announced = useRef(false);

  // A smaller list drops the rows that no longer exist.
  if (listCount !== count) {
    setListCount(count);
    if (activeKey !== null && activeKey >= count) setActiveKey(null);
    if (selectedKey !== null && selectedKey >= count) setSelectedKey(null);
  }

  // Typing stays responsive: the list re-renders with the deferred query.
  const deferredQuery = useDeferredValue(query);
  const keys = useMemo(
    () => (ready ? buildView(count, sort, deferredQuery) : NO_KEYS),
    [ready, count, sort, deferredQuery],
  );
  const positions = useMemo(() => positionsOf(keys, count), [keys, count]);
  const empty = ready && keys.length === 0;

  useEffect(() => {
    if (!ready || !liveRef.current) return;
    if (!announced.current && !deferredQuery) return; // nothing to say on load
    announced.current = true;
    liveRef.current.textContent = deferredQuery.trim()
      ? `${numberFormat.format(keys.length)} ${keys.length === 1 ? "ticket matches" : "tickets match"}`
      : `Showing all ${numberFormat.format(keys.length)} tickets`;
  }, [ready, keys.length, deferredQuery]);

  // An emptied list remounts at the top when matches come back.
  useEffect(() => {
    if (empty) anchorRef.current = null;
  }, [empty]);

  function handleQueryChange(next: string) {
    markUpdate("filter");
    setQuery(next);
  }

  function handleSortChange(next: Sort) {
    markUpdate("sort");
    setSort(next);
  }

  function handleJump(row: number) {
    const key = keys[row - 1];
    markUpdate("jump");
    apiRef.current?.reveal(key, "start");
    setActiveKey(key);
    apiRef.current?.focusKey(key);
  }

  // Stable, so urgent renders (typing) skip the memoized list.
  const handleSelect = useCallback((key: number) => {
    setSelectedKey(key);
    setActiveKey(key);
  }, []);

  const listProps = {
    keys,
    positions,
    count,
    activeKey,
    selectedKey,
    onActiveChange: setActiveKey,
    onSelect: handleSelect,
    debug,
    anchorRef,
    apiRef,
  };
  const selected = selectedKey === null ? null : ticketStore.get(selectedKey);
  const selectedInList = indexIn(positions, selectedKey) !== -1;
  const percent = Math.floor((Math.min(progress.generated, count) / count) * 100);

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        query={query}
        onQueryChange={handleQueryChange}
        sort={sort}
        onSortChange={handleSortChange}
        shown={keys.length}
        total={ready ? count : 0}
        onJump={handleJump}
      />
      <StatsBar virtual={mode === "virtual"} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="min-w-0">
          {!ready ? (
            <div
              aria-busy="true"
              aria-label="Generating tickets"
              className="flex h-112 flex-col gap-3 overflow-hidden rounded-lg border p-4 sm:h-128"
            >
              <p className="text-sm text-foreground/75 tabular-nums">
                Generating {numberFormat.format(count)} tickets… {percent}%
              </p>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : empty ? (
            <div className="flex h-112 flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center sm:h-128">
              <p className="font-medium">No tickets match “{deferredQuery}”</p>
              <p className="text-sm text-foreground/75">Try fewer or different words.</p>
              <Button variant="outline" onClick={() => handleQueryChange("")}>
                <FilterX aria-hidden /> Clear filter
              </Button>
            </div>
          ) : mode === "virtual" ? (
            <VirtualList key={`virtual-${count}`} {...listProps} estimate={estimate} overscan={overscan} />
          ) : (
            <NaiveList key={`naive-${count}`} {...listProps} />
          )}
        </div>
        <TicketDetails ticket={selected} inList={selectedInList} />
      </div>

      <p ref={liveRef} role="status" className="sr-only" />
    </div>
  );
}
