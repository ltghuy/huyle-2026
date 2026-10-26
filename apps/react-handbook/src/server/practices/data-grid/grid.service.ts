import "server-only";

import { getEmployees } from "./employees.data";
import { queryEmployees } from "./grid.query";
import type { QueryBody, QueryResult } from "./grid.schema";

/** Up to 50% random extra on top of the base, so responses can overtake each other. */
export function simulatedLatency(latencyMs: number) {
  return Math.round(latencyMs * (1 + Math.random() * 0.5));
}

/** Resolves after `ms`, or early (false) when the client aborts. */
export function delay(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    const timer = setTimeout(() => resolve(true), ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve(false);
      },
      { once: true },
    );
  });
}

/** Server mode: the same query the browser runs, over the server's copy. */
export function runQuery({ size, view, selection, onlySelected }: QueryBody): QueryResult {
  return queryEmployees(getEmployees(size), view, selection, onlySelected);
}
