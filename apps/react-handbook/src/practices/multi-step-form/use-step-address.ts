"use client";

// The current step lives in the address (?step=role), so refresh, links and
// the browser's Back/Forward buttons work per step. Moving forward adds a
// history entry; corrections (a step that can't be opened) replace it.
// Next keeps useSearchParams in sync with the native history API.

import { useSearchParams } from "next/navigation";

import { isStepId, type StepId } from "@/server/practices/multi-step-form/application.schema";

export function useRequestedStep(): StepId | null {
  const step = useSearchParams().get("step");
  return isStepId(step) ? step : null;
}

export function addressStep(): string | null {
  return new URLSearchParams(window.location.search).get("step");
}

export function goToStep(step: StepId, { replace = false } = {}) {
  const params = new URLSearchParams(window.location.search);
  // A second Next press before the re-render must not add another entry.
  if (params.get("step") === step) return;
  params.set("step", step);
  const url = `${window.location.pathname}?${params}`;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}
