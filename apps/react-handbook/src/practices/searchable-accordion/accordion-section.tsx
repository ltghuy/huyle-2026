"use client";

import { ChevronDown } from "lucide-react";
import { memo } from "react";

import { cn } from "@/lib/utils";
import type { FaqEntry } from "@/server/practices/searchable-accordion/faq.schema";

import type { AccordionAction } from "./accordion-state";
import { Highlight } from "./highlight";
import type { Match } from "./search";

type Props = {
  entry: FaqEntry;
  open: boolean;
  match: Match;
  /** Changes only when the match's ranges change; drives memoization. */
  matchKey: string;
  dispatch: React.Dispatch<AccordionAction>;
};

function AccordionSectionImpl({ entry, open, match, dispatch }: Props) {
  const buttonId = `faq-${entry.id}-button`;
  const panelId = `faq-${entry.id}-panel`;
  const snippet = !open && match.bodyOnly ? match.snippet : undefined;

  function handleToggle() {
    dispatch({ type: "toggle", id: entry.id });
  }

  return (
    <div className="border-b [contain-intrinsic-size:auto_3.5rem] [content-visibility:auto] last:border-b-0">
      <h3>
        <button
          id={buttonId}
          type="button"
          data-accordion-trigger
          aria-expanded={open}
          aria-controls={panelId}
          onClick={handleToggle}
          className="flex w-full items-start gap-3 rounded-md px-2 py-3 text-left text-sm font-medium outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <span className="min-w-0 flex-1">
            <Highlight text={entry.question} ranges={match.questionRanges} />
            {snippet ? (
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                  Match in answer
                </span>
                {snippet.leadingEllipsis ? "…" : null}
                <Highlight text={snippet.text} ranges={snippet.ranges} />
                {snippet.trailingEllipsis ? "…" : null}
              </span>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          id={panelId}
          aria-labelledby={buttonId}
          inert={!open}
          className="min-h-0 overflow-hidden"
        >
          <p className="px-2 pb-4 text-sm leading-relaxed text-muted-foreground">
            <Highlight text={entry.answer} ranges={open ? match.answerRanges : []} />
          </p>
        </div>
      </div>
    </div>
  );
}

export const AccordionSection = memo(
  AccordionSectionImpl,
  (a, b) =>
    a.entry === b.entry &&
    a.open === b.open &&
    a.matchKey === b.matchKey &&
    a.dispatch === b.dispatch,
);
