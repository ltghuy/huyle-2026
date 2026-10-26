"use client";

import { ChevronDown, CornerDownLeft, FileText, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { accordionReducer, type AccordionState } from "@/practices/searchable-accordion/accordion-state";
import { Highlight } from "@/practices/searchable-accordion/highlight";
import { indexEntries, matchEntry, MAX_QUERY_LENGTH, parseQuery } from "@/practices/searchable-accordion/search";

import { NAV_FOLDERS } from "./nav-folders";

// The page search reuses the Searchable Accordion practice: its accent- and
// case-insensitive all-words matching, its highlighting, and its reducer for
// the collapsible section groups. A page's title is the "question" and its
// summary the "answer".

const GROUPS = NAV_FOLDERS.map((folder) => {
  const indexed = indexEntries(folder.items.map((item) => ({ id: item.href, category: folder.title, question: item.title, answer: item.summary })));
  return { id: folder.id, title: folder.title, items: folder.items.map((item, i) => ({ item, ix: indexed[i] })) };
});

const INITIAL_GROUPS: AccordionState = { open: GROUPS.map((g) => g.id), mode: "multiple" };

const NAV_SELECTOR = "[data-search-nav]";

function subscribeNever() {
  return () => {};
}

function isApplePlatform() {
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

/** Visible results and group headers in DOM order, skipping collapsed groups. */
function navTargets(root: HTMLElement | null) {
  return [...(root?.querySelectorAll<HTMLElement>(NAV_SELECTOR) ?? [])].filter((el) => el.closest("[inert]") === null);
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border bg-muted px-1.5 font-mono text-[0.6875rem] leading-5 text-foreground">{children}</kbd>;
}

export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groupState, dispatch] = useReducer(accordionReducer, INITIAL_GROUPS);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const apple = useSyncExternalStore(subscribeNever, isApplePlatform, () => false);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const words = parseQuery(query);
  const filtering = words.length > 0;
  const groups = GROUPS.map((group) => ({
    ...group,
    hits: group.items.flatMap(({ item, ix }) => {
      const match = matchEntry(ix, words);
      return match ? [{ item, match }] : [];
    }),
  })).filter((group) => group.hits.length > 0);
  const total = groups.reduce((sum, group) => sum + group.hits.length, 0);

  function handleNavigate() {
    setOpen(false);
    setQuery("");
  }

  function handleToggleGroup(id: string) {
    dispatch({ type: "toggle", id });
  }

  function handleClear() {
    setQuery("");
    inputRef.current?.focus();
  }

  function moveFocus(from: Element | null, step: 1 | -1) {
    const targets = navTargets(resultsRef.current);
    const at = targets.indexOf(from as HTMLElement);
    const next = at === -1 ? targets[step === 1 ? 0 : targets.length - 1] : targets[at + step];
    if (next) next.focus();
    else if (step === -1) inputRef.current?.focus();
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(null, 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      navTargets(resultsRef.current)
        .find((el) => el.tagName === "A")
        ?.click();
    }
  }

  function handleResultsKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(document.activeElement, event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      // Typing on a result goes back to the search field.
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Meta+K Control+K"
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 max-sm:size-11 max-sm:justify-center max-sm:border-transparent max-sm:bg-transparent max-sm:px-0"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="max-sm:sr-only">Search pages…</span>
        <span aria-hidden className="ml-auto hidden sm:inline">
          <Kbd>{apple ? "⌘K" : "Ctrl K"}</Kbd>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          initialFocus={inputRef}
          className="top-4 flex max-h-[calc(100dvh-2rem)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:top-[10vh] sm:max-h-[80vh] sm:max-w-2xl"
        >
          <DialogTitle className="sr-only">Search pages</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              aria-label="Search pages"
              placeholder="Search pages"
              autoComplete="off"
              spellCheck={false}
              maxLength={MAX_QUERY_LENGTH}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {query ? (
              <Button variant="ghost" size="icon-sm" aria-label="Clear search" onClick={handleClear}>
                <X aria-hidden />
              </Button>
            ) : null}
            <DialogClose render={<Button variant="ghost" size="sm" className="sm:hidden" />}>Cancel</DialogClose>
          </div>

          <p role="status" className="sr-only">
            {filtering ? `${total} ${total === 1 ? "page" : "pages"} found` : ""}
          </p>

          {/* Arrow keys move between results; the links and buttons inside stay native. */}
          <div ref={resultsRef} onKeyDown={handleResultsKeyDown} className="min-h-0 flex-1 overflow-y-auto p-2">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-muted-foreground">
                <p>No pages match “{query.trim()}”.</p>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  Clear search
                </Button>
              </div>
            ) : (
              groups.map((group) => {
                const expanded = groupState.open.includes(group.id);
                const buttonId = `search-${group.id}-button`;
                const panelId = `search-${group.id}-panel`;
                return (
                  <section key={group.id} aria-labelledby={buttonId}>
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        data-search-nav
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={() => handleToggleGroup(group.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 pt-3 pb-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span className="min-w-0 flex-1 truncate">{group.title}</span>
                        <span className="font-normal tracking-normal normal-case tabular-nums">
                          {group.hits.length} {filtering ? (group.hits.length === 1 ? "match" : "matches") : group.hits.length === 1 ? "page" : "pages"}
                        </span>
                        <ChevronDown aria-hidden className={cn("size-4 shrink-0 transition-transform duration-200", expanded && "rotate-180")} />
                      </button>
                    </h3>
                    <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                      <div id={panelId} inert={!expanded} className="min-h-0 overflow-hidden">
                        <ul className="flex flex-col gap-0.5 p-0.5">
                          {group.hits.map(({ item, match }) => {
                            const snippet = match.bodyOnly ? match.snippet : undefined;
                            return (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  prefetch={false}
                                  data-search-nav
                                  onClick={handleNavigate}
                                  className="group flex items-start gap-3 rounded-lg px-2 py-2 outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                                >
                                  <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline gap-2 font-medium">
                                      {item.prefix ? <span className="font-mono text-xs text-muted-foreground tabular-nums">{item.prefix}</span> : null}
                                      <span className={cn("min-w-0", !item.ready && "text-muted-foreground")}>
                                        <Highlight text={item.title} ranges={match.questionRanges} />
                                      </span>
                                      {item.ready ? null : (
                                        <span className="shrink-0 rounded border px-1 text-[0.6875rem] leading-4 font-normal text-muted-foreground">
                                          Soon<span className="sr-only">: coming soon</span>
                                        </span>
                                      )}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                      {snippet ? (
                                        <>
                                          {snippet.leadingEllipsis ? "…" : null}
                                          <Highlight text={snippet.text} ranges={snippet.ranges} />
                                          {snippet.trailingEllipsis ? "…" : null}
                                        </>
                                      ) : (
                                        <Highlight text={item.summary} ranges={match.answerRanges} />
                                      )}
                                    </span>
                                  </span>
                                  <CornerDownLeft aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </section>
                );
              })
            )}
          </div>

          <div className="hidden items-center gap-4 border-t px-4 py-2 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> to open
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> to move
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <Kbd>esc</Kbd> to close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
