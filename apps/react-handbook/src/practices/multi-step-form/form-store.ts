// The wizard's form engine: one store for every answer and what's known
// about it (visited fields, steps where Next was tried, server errors, the
// furthest step reached, the email check, the submission). Components
// subscribe to the slice they show, so a keystroke re-renders one field,
// not the form.
//
// Errors aren't stored: they're derived from the values with the shared
// step rules, and only *shown* once a field was left, its step was tried,
// or the server reported one.

import { useRef, useSyncExternalStore } from "react";

import {
  EMAIL_TAKEN,
  EMPTY_VALUES,
  monthOf,
  sampleValues,
  type ApplicationValues,
  type FieldIssue,
  type StepId,
} from "@/server/practices/multi-step-form/application.schema";

import { isWithin, setAt } from "./paths";
import { laterOf, stepIssues } from "./steps";

export type EmailStatus = "idle" | "checking" | "available" | "taken" | "error";
export type EmailState = { email: string; status: EmailStatus; message?: string };

export type SubmitState = { status: "idle" } | { status: "submitting" } | { status: "failed"; message: string };

export type FormState = {
  values: ApplicationValues;
  visited: ReadonlySet<string>;
  attempted: ReadonlySet<StepId>;
  serverErrors: ReadonlyMap<string, string>;
  furthest: StepId;
  email: EmailState;
  submit: SubmitState;
  /** "YYYY-MM" when the visit started: month rules are relative to it. */
  today: string;
};

function initialState(values: ApplicationValues = EMPTY_VALUES, furthest: StepId = "personal"): FormState {
  return {
    values,
    visited: new Set(),
    attempted: new Set(),
    serverErrors: new Map(),
    furthest,
    email: { email: "", status: "idle" },
    submit: { status: "idle" },
    today: monthOf(new Date()),
  };
}

let state = initialState();
const listeners = new Set<() => void>();

function update(next: Partial<FormState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const form = {
  get: () => state,
  subscribe,

  setValue(path: string, value: unknown) {
    // A changed answer drops the server's verdict on it (and on anything inside or around it).
    const stale = [...state.serverErrors.keys()].filter((p) => isWithin(p, path) || isWithin(path, p));
    const serverErrors = stale.length === 0 ? state.serverErrors : new Map([...state.serverErrors].filter(([p]) => !stale.includes(p)));
    update({ values: setAt(state.values, path, value), serverErrors });
  },

  visit(path: string) {
    if (!state.visited.has(path)) update({ visited: new Set(state.visited).add(path) });
  },

  /** Forgets visited flags inside a path (list items moved or removed: paths shifted). */
  unvisit(prefix: string) {
    const visited = [...state.visited].filter((p) => !isWithin(p, prefix));
    if (visited.length !== state.visited.size) update({ visited: new Set(visited) });
  },

  attempt(step: StepId) {
    if (!state.attempted.has(step)) update({ attempted: new Set(state.attempted).add(step) });
  },

  reach(step: StepId) {
    const furthest = laterOf(state.furthest, step);
    if (furthest !== state.furthest) update({ furthest });
  },

  setServerErrors(issues: FieldIssue[]) {
    const serverErrors = new Map<string, string>();
    for (const issue of issues) if (!serverErrors.has(issue.path)) serverErrors.set(issue.path, issue.message);
    const attempted = new Set(state.attempted);
    for (const issue of issues) if (issue.step) attempted.add(issue.step);
    update({ serverErrors, attempted });
  },

  setEmail(email: EmailState) {
    update({ email });
  },

  setSubmit(submit: SubmitState) {
    update({ submit });
  },

  /** Restored draft or sample answers: a fresh visit with these values. */
  load(values: ApplicationValues, furthest: StepId) {
    state = initialState(values, furthest);
    for (const listener of listeners) listener();
  },

  reset() {
    form.load(EMPTY_VALUES, "personal");
  },

  /** Valid answers for every step; a fresh email each time, so it was never used. */
  fillSample() {
    const values = sampleValues(monthOf(new Date()));
    form.load(setAt(values, "personal.email", `alex.morgan.${Date.now().toString(36)}@example.com`), "review");
  },
};

// -- reading -----------------------------------------------------------------------

function stepOf(path: string) {
  return path.split(".")[0] as StepId;
}

/** The message to show for a field right now, or null. */
export function visibleError(s: FormState, path: string): string | null {
  const server = s.serverErrors.get(path);
  if (server) return server;
  if (path === "personal.email" && s.email.status === "taken" && s.email.email === normalizeEmail(s.values.personal.email)) {
    return s.email.message ?? EMAIL_TAKEN;
  }
  const step = stepOf(path);
  if (!s.visited.has(path) && !s.attempted.has(step)) return null;
  return stepIssues(step, s.values, s.today).find((issue) => issue.path === path)?.message ?? null;
}

/** Problems listed in the step's error summary (after Next/Submit was tried there). */
export function summaryIssues(s: FormState, step: StepId): FieldIssue[] {
  if (!s.attempted.has(step)) return [];
  const seen = new Set<string>();
  const issues: FieldIssue[] = [];
  const add = (issue: FieldIssue) => {
    if (seen.has(issue.path)) return;
    seen.add(issue.path);
    issues.push({ ...issue, message: s.serverErrors.get(issue.path) ?? issue.message });
  };
  for (const [path, message] of s.serverErrors) if (stepOf(path) === step) add({ step, path, message });
  if (step === "personal" && s.email.email === normalizeEmail(s.values.personal.email)) {
    // A taken email, or a check that failed even after a retry, blocks Next.
    if (s.email.status === "taken") add({ step, path: "personal.email", message: s.email.message ?? EMAIL_TAKEN });
    if (s.email.status === "error" && s.email.message) add({ step, path: "personal.email", message: s.email.message });
  }
  for (const issue of stepIssues(step, s.values, s.today)) add(issue);
  return issues;
}

/**
 * Subscribes to a slice of the form. The component re-renders only when
 * `isEqual(previous, next)` is false.
 */
export function useFormSelector<T>(selector: (s: FormState) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  // Memoized per store state and selector, so getSnapshot returns a stable
  // value; a selector that closes over props is re-run when they change.
  const cache = useRef<{ state: FormState; selector: (s: FormState) => T; value: T } | null>(null);

  const getSnapshot = () => {
    const current = state;
    const previous = cache.current;
    if (previous && previous.state === current && previous.selector === selector) return previous.value;
    const value = selector(current);
    if (previous && isEqual(previous.value, value)) {
      cache.current = { state: current, selector, value: previous.value };
      return previous.value;
    }
    cache.current = { state: current, selector, value };
    return value;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function sameField(a: FieldView, b: FieldView) {
  return a.value === b.value && a.error === b.error;
}

export type FieldView = { value: unknown; error: string | null };

/** One field's value and visible error; re-renders only when either changes. */
export function useField(path: string): FieldView {
  return useFormSelector((s) => {
    let value: unknown = s.values;
    for (const key of path.split(".")) value = (value as Record<string, unknown> | undefined)?.[key];
    return { value, error: visibleError(s, path) };
  }, sameField);
}

export function useFormState() {
  return useFormSelector((s) => s);
}
