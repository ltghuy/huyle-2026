// Content pages keep their state in query params on a static route
// (design.md: `/vocabulary?level=A1&topic=home`, `/grammar?topic=…`, `/exercises?id=…`).
// Next's router picks up native history updates, so `useSearchParams` follows
// these changes without a server round trip.

import { LEVELS, type Level } from "@/learning/types";

export type SearchParamsPatch = Record<string, string | null>;

/** `search` with `patch` applied (null removes a param), as "?…" or "". */
export function withParams(search: string, patch: SearchParamsPatch): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Applies `patch` to the address bar without a navigation. Browser only. */
export function updateSearchParams(patch: SearchParamsPatch, mode: "push" | "replace" = "replace"): void {
  const href = `${window.location.pathname}${withParams(window.location.search, patch)}`;
  if (mode === "push") window.history.pushState(null, "", href);
  else window.history.replaceState(null, "", href);
}

export function parseLevel(value: string | null): Level | null {
  return LEVELS.find((level) => level === value) ?? null;
}
