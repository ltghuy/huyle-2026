"use client";

import { ArrowDownToLine, Search } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { numberFormat } from "./ticket-row";
import { SORTS, type Sort } from "./view";

const SEPARATORS = /[\s,_]/g;
const WHOLE_NUMBER = /^\d+$/;

/** Parses "87,000" → 87000; null unless a whole number in [1, max]. */
export function parseRow(text: string, max: number) {
  const digits = text.replace(SEPARATORS, "");
  if (!WHOLE_NUMBER.test(digits)) return null;
  const row = Number(digits);
  return row >= 1 && row <= max ? row : null;
}

export function Toolbar({
  query, onQueryChange, sort, onSortChange, shown, total, onJump,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  /** Tickets in the current list, and generated in all. */
  shown: number;
  total: number;
  onJump: (row: number) => void;
}) {
  const ids = { filter: useId(), sort: useId(), jump: useId(), hint: useId(), count: useId() };
  const [jump, setJump] = useState("");
  const [invalid, setInvalid] = useState(false);

  function handleJump(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const row = parseRow(jump, shown);
    setInvalid(row === null);
    if (row !== null) onJump(row);
  }

  function handleJumpChange(event: React.ChangeEvent<HTMLInputElement>) {
    setJump(event.target.value);
    setInvalid(false);
  }

  const range = shown > 0 ? `1–${numberFormat.format(shown)}` : "none";

  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <label htmlFor={ids.filter} className="text-xs font-medium text-muted-foreground">
          Filter
        </label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={ids.filter}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Title, text or requester"
            aria-describedby={ids.count}
            className="pl-8"
          />
        </div>
        <p id={ids.count} className="text-xs text-muted-foreground tabular-nums">
          {numberFormat.format(shown)} of {numberFormat.format(total)} tickets
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.sort} className="text-xs font-medium text-muted-foreground">
          Sort
        </label>
        <select
          id={ids.sort}
          value={sort}
          onChange={(e) => onSortChange(e.target.value as Sort)}
          className="h-8 rounded-lg border bg-background px-2 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleJump} noValidate className="flex flex-col gap-1">
        <label htmlFor={ids.jump} className="text-xs font-medium text-muted-foreground">
          Go to row
        </label>
        <div className="flex gap-2">
          <Input
            id={ids.jump}
            inputMode="numeric"
            autoComplete="off"
            value={jump}
            onChange={handleJumpChange}
            placeholder="e.g. 87,000"
            aria-invalid={invalid}
            aria-describedby={ids.hint}
            className="w-32"
          />
          <Button type="submit" variant="outline" disabled={shown === 0}>
            <ArrowDownToLine aria-hidden /> Go
          </Button>
        </div>
        <p
          id={ids.hint}
          className={invalid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
        >
          {invalid ? `Enter a whole number from ${range}` : `Rows ${range}`}
        </p>
      </form>
    </div>
  );
}
