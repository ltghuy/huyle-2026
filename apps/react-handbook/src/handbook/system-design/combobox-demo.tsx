"use client";

import { useId, useRef, useState } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { normalize, search } from "./search-sim";

// A hand-built combobox following the WAI-ARIA pattern: a role=combobox input
// with aria-expanded / aria-controls / aria-activedescendant over a role=listbox
// of role=option items. Keyboard: Arrow Up/Down (wrapping), Enter, Escape.

function Highlight({ text, query }: { text: string; query: string }) {
  const q = normalize(query);
  const i = q === "" ? -1 : text.toLowerCase().indexOf(q);
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-foreground underline underline-offset-2">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function ComboboxDemo() {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = search(query, 8);
  const showList = open && query.trim() !== "";
  const activeId = showList && options[active] ? `${baseId}-opt-${active}` : undefined;

  function change(value: string) {
    setQuery(value);
    setChosen(null);
    setOpen(true);
    setActive(0);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    setQuery(option);
    setChosen(option);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (options.length > 0) setActive((a) => (a + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (options.length > 0) setActive((a) => (a - 1 + options.length) % options.length);
    } else if (event.key === "Enter") {
      if (showList && options[active]) {
        event.preventDefault();
        choose(active);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label htmlFor={`${baseId}-input`} className="text-xs text-foreground/75">
          Search (try &quot;re&quot;, then use the arrow keys)
        </Label>
        <div className="relative">
          <input
            ref={inputRef}
            id={`${baseId}-input`}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => change(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim() !== "" && setOpen(true)}
            placeholder="search…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {showList ? (
            <ul id={listId} role="listbox" aria-label="Suggestions" className="absolute z-10 mt-1 flex w-full flex-col overflow-hidden rounded-md border bg-popover shadow-md">
              {options.length === 0 ? (
                <li className="px-3 py-2 text-sm text-foreground/60">No matches</li>
              ) : (
                options.map((option, i) => (
                  <li
                    key={option}
                    id={`${baseId}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(i)}
                    className={cn("cursor-pointer px-3 py-2 text-sm", i === active ? "bg-accent text-accent-foreground" : "")}
                  >
                    <Highlight text={option} query={query} />
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-foreground/85">
        {chosen ? `Selected: ${chosen}` : "Type to see suggestions; Arrow keys move, Enter selects, Escape closes."}
      </p>
    </div>
  );
}
