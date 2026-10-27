// Test-only stand-in for `next/navigation`: `useSearchParams` follows
// `window.location`, and native history updates re-render subscribers the way
// Next's router does in the browser. Use with
// `vi.mock("next/navigation", () => import("@/components/library/test-navigation"))`.
import { useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let patched = false;

function patchHistory() {
  if (patched) return;
  patched = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = (...args: Parameters<History["pushState"]>) => {
      original(...args);
      listeners.forEach((listener) => listener());
    };
  }
  window.addEventListener("popstate", () => listeners.forEach((listener) => listener()));
}

function subscribe(listener: () => void) {
  patchHistory();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function usePathname(): string {
  return window.location.pathname;
}

export function useRouter() {
  return { push: () => {}, replace: () => {}, back: () => window.history.back(), prefetch: () => {}, refresh: () => {} };
}
