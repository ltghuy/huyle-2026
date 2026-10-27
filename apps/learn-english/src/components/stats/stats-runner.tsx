"use client";

import { useEffect } from "react";
import { flushIfNewDay, flushOnHide } from "@/stats/stats-client";

function handleVisibilityChange() {
  if (document.visibilityState === "hidden") void flushOnHide();
  else void flushIfNewDay();
}

/** Sends the anonymous usage counters: yesterday's on open, today's when the page is hidden. Renders nothing. */
export function StatsRunner() {
  useEffect(() => {
    void flushIfNewDay();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
  return null;
}
