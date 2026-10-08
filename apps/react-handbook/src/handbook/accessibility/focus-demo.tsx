"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { accessibleName } from "./a11y-reader";
import { ReaderBox, Toggle, useDomSnapshot, WrongWay } from "./ui";

const RING = "rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring";
const NO_RING = "rounded-sm outline-none";
const MAX_LOG = 12;

type Visit = { id: number; name: string };

let nextVisitId = 0;

export function FocusDemo() {
  const [skipLink, setSkipLink] = useState(true);
  const [positive, setPositive] = useState(false);
  const [hideRing, setHideRing] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const siteRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tabOrder = useDomSnapshot(siteRef, readTabOrder);

  const focusClass = hideRing ? NO_RING : RING;

  function handleFocus(event: React.FocusEvent) {
    const name = accessibleName(event.target).name || event.target.tagName.toLowerCase();
    setVisits((current) => [...current, { id: nextVisitId++, name }].slice(-MAX_LOG));
  }

  function handleSkip(event: React.MouseEvent) {
    event.preventDefault();
    contentRef.current?.focus();
  }

  function handleSiteClick(event: React.MouseEvent) {
    // The sample's links go nowhere.
    if ((event.target as HTMLElement).closest("a[data-sample]")) event.preventDefault();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Toggle checked={skipLink} onCheckedChange={setSkipLink} title="Skip link" detail="First stop: jumps past the navigation" />
        <Toggle
          checked={positive}
          onCheckedChange={setPositive}
          title={<>tabindex=&quot;1&quot; on “Order now”</>}
          detail={positive ? <WrongWay /> : "A positive tab index moves it to the front of the whole page"}
        />
        <Toggle
          checked={hideRing}
          onCheckedChange={setHideRing}
          title={<>Hide the focus outline</>}
          detail={hideRing ? <WrongWay /> : <>outline: none with no replacement</>}
        />
      </div>

      <p className="text-sm text-foreground/85">
        Press <kbd className="font-mono">Tab</kbd> from the settings above to move through the sample site.
      </p>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div ref={siteRef} onFocus={handleFocus} onClick={handleSiteClick} className="flex min-w-0 flex-col rounded-lg border">
          {skipLink ? (
            <a data-sample href="#focus-sample-content" onClick={handleSkip} className={cn("mx-3 mt-3 w-fit text-sm underline underline-offset-4", focusClass)}>
              Skip to content
            </a>
          ) : null}
          <nav aria-label="Sample site" className="flex flex-wrap gap-x-4 gap-y-1 border-b px-3 py-3 text-sm">
            {["Home", "Menu", "Hours", "Contact"].map((label) => (
              <a key={label} data-sample href="#keyboard-focus" className={cn("font-medium", focusClass)}>
                {label}
              </a>
            ))}
          </nav>
          <div id="focus-sample-content" ref={contentRef} tabIndex={-1} aria-label="Sample content" className="flex flex-col gap-2 p-3 outline-none">
            <p className="text-sm font-medium">Today&apos;s special: rye with caraway</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" tabIndex={positive ? 1 : undefined} className={cn(hideRing && "focus-visible:ring-0 focus-visible:border-transparent")}>
                Order now
              </Button>
              <Button size="sm" variant="outline" className={cn(hideRing && "focus-visible:ring-0 focus-visible:border-border")}>
                Save for later
              </Button>
            </div>
            <a data-sample href="#keyboard-focus" className={cn("w-fit text-sm underline underline-offset-4", focusClass)}>
              Read the reviews
            </a>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <ReaderBox label="Focus visited (from real focus events)">
            {visits.length === 0 ? (
              "nothing yet"
            ) : (
              <ol className="flex flex-col gap-0.5">
                {visits.map((visit, i) => (
                  <li key={visit.id}>
                    {i + 1}. {visit.name}
                  </li>
                ))}
              </ol>
            )}
          </ReaderBox>
          <ReaderBox label="Tab order the browser will use">{tabOrder}</ReaderBox>
          <Button variant="outline" size="sm" className="w-fit" onClick={() => setVisits([])}>
            Clear the list
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Sequential focus order: positive tab indexes first (ascending), then 0 in document order. */
function readTabOrder(root: HTMLElement) {
  const focusables = [...root.querySelectorAll<HTMLElement>("a[href], button, input, [tabindex]")].filter((el) => el.tabIndex >= 0);
  const ordered = [...focusables.filter((el) => el.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex), ...focusables.filter((el) => el.tabIndex === 0)];
  return ordered
    .map((el) => `${accessibleName(el).name}${el.tabIndex > 0 ? " (tabindex 1: before everything else on the page)" : ""}`)
    .join(" → ");
}
