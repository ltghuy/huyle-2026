// The draft: the applicable answers, the step and the furthest step reached,
// saved in this browser shortly after every change. A saved draft is
// untrusted input (older app versions, other tabs, hand edits), so it's
// parsed with a schema and migrated before use. The schema checks types
// only: an answer that breaks today's rules is kept and shown with its error.

import { useSyncExternalStore } from "react";
import { z } from "zod";

import {
  EMPTY_VALUES,
  isStepId,
  type ApplicationValues,
  type StepId,
} from "@/server/practices/multi-step-form/application.schema";
import { toast } from "@/practices/toast-notifications/toast-store";

import { form } from "./form-store";
import { applicableSlice } from "./steps";

export const DRAFT_KEY = "rp.multi-step-form.draft";
const SAVE_DELAY_MS = 400;

const text = z.string().max(5000);
const list = z.array(z.string().max(100)).max(20);
const loose = {
  personal: z.object({ fullName: text, email: text, phone: text, country: text }),
  role: z.object({ role: text, employment: text, startMonth: text, needsSponsorship: text }),
  experience: z.object({
    none: z.boolean(),
    entries: z.array(z.object({ id: text, company: text, title: text, startMonth: text, endMonth: text, current: z.boolean() })).max(10),
  }),
  engineering: z.object({ languages: list, years: text, profileUrl: text }),
  design: z.object({ portfolioUrl: text, tools: list }),
  authorization: z.object({ residence: text, status: text, earliestMonth: text }),
  extras: z.object({ coverLetter: text, salaryMin: text, salaryMax: text, source: text }),
  review: z.object({ consent: z.boolean() }),
};

const stepId = z.string().refine(isStepId);

const draftV2 = z.object({
  version: z.literal(2),
  savedAt: z.iso.datetime(),
  step: stepId,
  furthest: stepId,
  values: z.object(loose).partial(),
});

/** What version 1 of the app saved: flat fields and a list of jobs. */
const draftV1 = z.object({
  version: z.literal(1),
  savedAt: z.iso.datetime().optional(),
  data: z.object({
    name: text,
    email: text,
    role: text,
    jobs: z.array(z.object({ company: text, position: text, from: text, to: text })).max(10),
  }),
});

export type Draft = { savedAt: string; step: StepId; furthest: StepId; values: ApplicationValues };
export type DraftRead = { draft: Draft | null; notice: string | null; discard: boolean };

function fromV1(v1: z.infer<typeof draftV1>): Draft {
  const { name, email, role, jobs } = v1.data;
  return {
    savedAt: v1.savedAt ?? new Date().toISOString(),
    step: "personal",
    furthest: "experience",
    values: {
      ...EMPTY_VALUES,
      personal: { ...EMPTY_VALUES.personal, fullName: name, email },
      role: { ...EMPTY_VALUES.role, role },
      experience: {
        none: false,
        entries: jobs.map((job, i) => ({
          id: `v1-${i}`,
          company: job.company,
          title: job.position,
          startMonth: job.from,
          endMonth: job.to === "present" ? "" : job.to,
          current: job.to === "present",
        })),
      },
    },
  };
}

/** Parses a saved value: a current draft, a migrated older one, or nothing (with the reason). */
export function parseDraft(raw: string | null): DraftRead {
  if (raw === null) return { draft: null, notice: null, discard: false };
  const unreadable: DraftRead = { draft: null, notice: "Your saved draft couldn't be read, so the form starts empty.", discard: true };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return unreadable;
  }
  const v2 = draftV2.safeParse(json);
  if (v2.success) {
    const { savedAt, step, furthest, values } = v2.data;
    return { draft: { savedAt, step: step as StepId, furthest: furthest as StepId, values: { ...EMPTY_VALUES, ...values } }, notice: null, discard: false };
  }
  const v1 = draftV1.safeParse(json);
  if (v1.success) return { draft: fromV1(v1.data), notice: "Your draft was saved by an older version of this form and has been updated.", discard: false };
  return unreadable;
}

export function serializeDraft(values: ApplicationValues, step: StepId, furthest: StepId) {
  return JSON.stringify({ version: 2, savedAt: new Date().toISOString(), step, furthest, values: applicableSlice(values) });
}

// -- storage -----------------------------------------------------------------------

export function readDraft(): DraftRead {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DRAFT_KEY);
  } catch {
    return { draft: null, notice: null, discard: false };
  }
  const result = parseDraft(raw);
  if (result.discard) clearDraft();
  return result;
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage is blocked: there's nothing saved to clear.
  }
}

/** Demo helper: store a raw value as if an older version (or a bug) saved it. */
export function writeRawDraft(value: string) {
  try {
    localStorage.setItem(DRAFT_KEY, value);
    return true;
  } catch {
    return false;
  }
}

// -- autosave ------------------------------------------------------------------------

export type DraftStatus = {
  /** The draft was read (once per page load); until then the wizard shows a skeleton. */
  ready: boolean;
  savedAt: string | null;
  restored: { savedAt: string; notice: string | null } | null;
  /** Why a saved draft was thrown away, if it was. */
  discarded: string | null;
  blocked: boolean;
};

const INITIAL_STATUS: DraftStatus = { ready: false, savedAt: null, restored: null, discarded: null, blocked: false };
let status = INITIAL_STATUS;
const listeners = new Set<() => void>();

function setStatus(next: Partial<DraftStatus>) {
  status = { ...status, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDraftStatus() {
  return useSyncExternalStore(subscribe, () => status, () => INITIAL_STATUS);
}

/**
 * Loads the saved draft into the form, once per page load. Returns the
 * step it was on, so the wizard can open it when the address names none.
 */
export function restoreDraft(): StepId | null {
  if (status.ready) return null;
  const { draft, notice, discard } = readDraft();
  if (draft) form.load(draft.values, draft.furthest);
  setStatus({
    ready: true,
    savedAt: draft?.savedAt ?? null,
    restored: draft ? { savedAt: draft.savedAt, notice } : null,
    discarded: discard ? notice : null,
  });
  return draft?.step ?? null;
}

/** After Start over, a submission, or loading a demo draft: forget what the notices said. */
export function resetDraftStatus() {
  setStatus({ savedAt: null, restored: null, discarded: null });
}

/** Demo helper: read the stored draft again as if the page had just loaded. */
export function reloadDraft(): StepId | null {
  status = { ...status, ready: false };
  return restoreDraft();
}

export function dismissDraftNotice() {
  setStatus({ restored: null, discarded: null });
}

function hasAnswers(values: ApplicationValues) {
  return JSON.stringify(values) !== JSON.stringify(EMPTY_VALUES);
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (status.blocked && hasAnswers(form.get().values)) event.preventDefault();
}

/** Writes now; on failure warns once and guards leaving the page. */
export function saveDraft(step: StepId) {
  const { values, furthest } = form.get();
  // An empty form isn't a draft: nothing to restore next time.
  if (!hasAnswers(values)) {
    clearDraft();
    setStatus({ savedAt: null });
    return;
  }
  try {
    const value = serializeDraft(values, step, furthest);
    localStorage.setItem(DRAFT_KEY, value);
    setStatus({ savedAt: JSON.parse(value).savedAt });
  } catch {
    if (!status.blocked) {
      toast.warning("Your progress can't be saved", { description: "This browser is blocking storage. Your answers last until you leave this page." });
      window.addEventListener("beforeunload", handleBeforeUnload);
      setStatus({ blocked: true });
    }
  }
}

/** Saves shortly after every change of the answers; returns a stop function. */
export function startAutosave(getStep: () => StepId) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let values = form.get().values;
  const unsubscribe = form.subscribe(() => {
    const next = form.get().values;
    if (next === values) return;
    values = next;
    clearTimeout(timer);
    timer = setTimeout(() => saveDraft(getStep()), SAVE_DELAY_MS);
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

// -- demo samples -------------------------------------------------------------------

export const SAMPLE_V1_DRAFT = JSON.stringify({
  version: 1,
  savedAt: "2026-09-30T09:15:00.000Z",
  data: {
    name: "Sam Rivera",
    email: "sam.rivera@example.com",
    role: "design",
    jobs: [
      { company: "Fabrikam", position: "Product Designer", from: "2023-02", to: "present" },
      { company: "Litware", position: "UI Designer", from: "2020-06", to: "2023-01" },
    ],
  },
});

export const SAMPLE_CORRUPT_DRAFT = '{"version":2,"step":"role","values":{"personal":{"fullName":';
