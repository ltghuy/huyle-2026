"use client";

import { STEPS, applicableSteps, stepIssues } from "./steps";
import { useFormState } from "./form-store";

function Block({ title, value, open }: { title: string; value: unknown; open?: boolean }) {
  return (
    <details open={open} className="min-w-0 rounded-lg border">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{title}</summary>
      {/* Focusable so keyboard users can scroll it. */}
      <pre
        tabIndex={0}
        aria-label={title}
        className="max-h-72 overflow-auto border-t px-3 py-2 font-mono text-xs leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

/**
 * The learner's window into the form engine. It subscribes to the whole
 * store, so it re-renders on every change (the fields themselves don't).
 */
export function FormInspector() {
  const s = useFormState();
  const steps = applicableSteps(s.values);
  const errors = Object.fromEntries(
    steps.flatMap((step) => stepIssues(step, s.values, s.today).map((issue) => [issue.path, issue.message] as const)),
  );

  return (
    <section aria-labelledby="msf-inspector" className="flex min-w-0 flex-col gap-2">
      <h3 id="msf-inspector" className="text-sm font-medium">
        Form inspector
      </h3>
      <p className="text-sm text-muted-foreground">
        Live state of the form engine. Errors exist from the first keystroke; a field only shows its error once it was visited or its step was tried.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <Block
          title="Steps"
          open
          value={{
            applicable: steps.map((step) => STEPS[step].title),
            furthestReached: STEPS[s.furthest].title,
            tried: [...s.attempted],
          }}
        />
        <Block title="Requests" open value={{ emailCheck: s.email, submit: s.submit }} />
        <Block title="Values" value={s.values} />
        <Block title={`Errors from the rules (${Object.keys(errors).length})`} value={errors} />
        <Block title={`Visited fields (${s.visited.size})`} value={[...s.visited]} />
        <Block title={`Server errors (${s.serverErrors.size})`} value={Object.fromEntries(s.serverErrors)} />
      </div>
    </section>
  );
}
