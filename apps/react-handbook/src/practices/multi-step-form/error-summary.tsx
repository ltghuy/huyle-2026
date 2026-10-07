"use client";

import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FieldIssue, StepId } from "@/server/practices/multi-step-form/application.schema";

import { ERROR_TEXT } from "./fields";
import { summaryIssues, useFormSelector } from "./form-store";
import { fieldId, focusField } from "./paths";

export const SUMMARY_ID = "msf-error-summary";

function sameIssues(a: FieldIssue[], b: FieldIssue[]) {
  return a.length === b.length && a.every((issue, i) => issue.path === b[i].path && issue.message === b[i].message);
}

/** Focuses the field for a path, or its nearest parent that has a control (e.g. a whole list). */
function handleJump(event: React.MouseEvent<HTMLAnchorElement>, path: string) {
  event.preventDefault();
  const parts = path.split(".");
  while (parts.length > 0 && !focusField(parts.join("."))) parts.pop();
}

/**
 * Every problem on the step, shown after Next or Submit was tried there.
 * The wizard moves focus here; each item focuses its field.
 */
export function ErrorSummary({ step }: { step: StepId }) {
  const issues = useFormSelector((s) => summaryIssues(s, step), sameIssues);
  if (issues.length === 0) return null;

  return (
    <div
      id={SUMMARY_ID}
      tabIndex={-1}
      aria-labelledby={`${SUMMARY_ID}-title`}
      className="rounded-lg border-2 border-destructive/60 bg-destructive/5 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <h3 id={`${SUMMARY_ID}-title`} className={cn("flex items-center gap-2 font-medium", ERROR_TEXT)}>
        <CircleAlert aria-hidden className="size-4" />
        {issues.length === 1 ? "There is a problem on this step" : `There are ${issues.length} problems on this step`}
      </h3>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {issues.map((issue) => (
          <li key={issue.path} className="ml-6 list-disc">
            <a href={`#${fieldId(issue.path)}`} className="underline underline-offset-2 hover:no-underline" onClick={(e) => handleJump(e, issue.path)}>
              {issue.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
