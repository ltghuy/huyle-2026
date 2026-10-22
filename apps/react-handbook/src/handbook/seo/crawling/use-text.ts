"use client";

import { useEffect, useState } from "react";

export type TextLoad = { state: "loading" } | { state: "done"; text: string; status: number } | { state: "error"; message: string };

/** Fetches a same-origin text file (robots.txt, the sitemap) with a retry. */
export function useText(path: string) {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<TextLoad>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(path, { cache: "no-store", signal: controller.signal })
      .then(async (res) => setLoad({ state: "done", text: await res.text(), status: res.status }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoad({ state: "error", message: error instanceof Error ? error.message : String(error) });
      });
    return () => controller.abort();
  }, [path, attempt]);

  function retry() {
    setLoad({ state: "loading" });
    setAttempt((n) => n + 1);
  }

  return { load, retry };
}
