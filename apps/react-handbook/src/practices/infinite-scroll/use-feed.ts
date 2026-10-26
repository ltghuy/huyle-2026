"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { feedCache, type FeedEvent, type FeedSnapshot } from "./feed-cache";
import { fetchNewer, fetchPage } from "./feed-api";

export type FeedOptions = {
  limit: number;
  latencyMs: number;
  failRate: number;
};

const FRESH: FeedSnapshot = {
  posts: [],
  status: "loading",
  error: null,
  nextCursor: null,
  topCursor: null,
  total: null,
  pending: [],
  pendingCount: 0,
  pendingCursor: null,
  requests: 1,
  event: null,
};

let eventId = 0;
function event<T extends Omit<FeedEvent, "id">>(e: T) {
  return { ...e, id: ++eventId } as FeedEvent;
}

/** A cached snapshot may have been saved mid-request; that request was aborted. */
function restore(): { state: FeedSnapshot; resumed: boolean } {
  const cached = feedCache.read();
  if (!cached) return { state: FRESH, resumed: false };
  const status = cached.status === "loading" ? "idle" : cached.status;
  return { state: { ...cached, status, event: null }, resumed: true };
}

export function useFeed(options: FeedOptions, pollMs: number) {
  const [initial] = useState(restore);
  const [state, setState] = useState(initial.state);
  const stateRef = useRef(state);
  const inFlight = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  // Read at request time, so control changes apply to the next request.
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    stateRef.current = state;
    feedCache.write(state);
  }, [state]);

  const request = useCallback(
    (cursor: string | null) => {
      inFlight.current = true;
      const controller = new AbortController();
      abortRef.current = controller;
      fetchPage({ cursor, ...optionsRef.current }, controller.signal).then(
        (page) => {
          inFlight.current = false;
          setState((s) => {
            const known = new Set(s.posts.map((p) => p.id));
            const fresh = page.data.filter((p) => !known.has(p.id));
            const posts = [...s.posts, ...fresh];
            const ended = page.nextCursor === null;
            return {
              ...s,
              posts,
              status: ended ? "ended" : "idle",
              error: null,
              nextCursor: page.nextCursor,
              topCursor: s.topCursor ?? page.topCursor ?? null,
              total: page.total,
              event: ended
                ? event({ type: "ended", total: posts.length })
                : event({ type: "loaded", count: fresh.length, total: posts.length }),
            };
          });
        },
        (error: unknown) => {
          inFlight.current = false;
          if (controller.signal.aborted) return;
          setState((s) => ({
            ...s,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
            event: event({ type: "error" }),
          }));
        },
      );
    },
    [],
  );

  // First page on a fresh mount; abort whatever is in flight on unmount.
  useEffect(() => {
    if (!initial.resumed) request(null);
    return () => {
      abortRef.current?.abort();
      inFlight.current = false;
    };
  }, [initial.resumed, request]);

  /** Loads the next page; ignored while a request is in flight or at the end. */
  const loadMore = useCallback(() => {
    const s = stateRef.current;
    if (inFlight.current || s.status === "ended") return;
    setState((prev) => ({ ...prev, status: "loading", requests: prev.requests + 1 }));
    request(s.nextCursor);
  }, [request]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    inFlight.current = false;
    feedCache.clear();
    setState(FRESH);
    request(null);
  }, [request]);

  const showPending = useCallback(() => {
    setState((s) => {
      if (s.pending.length === 0) return s;
      return {
        ...s,
        posts: [...s.pending, ...s.posts],
        topCursor: s.pendingCursor ?? s.topCursor,
        pending: [],
        pendingCount: Math.max(0, s.pendingCount - s.pending.length),
        pendingCursor: null,
        event: event({ type: "shown", count: s.pending.length }),
      };
    });
  }, []);

  // Check for newer posts; skipped while the tab is hidden. Failures are silent.
  useEffect(() => {
    const handle = window.setInterval(() => {
      const top = stateRef.current.topCursor;
      if (document.hidden || !top) return;
      fetchNewer(top).then(
        (result) =>
          setState((s) => {
            if (s.topCursor !== top) return s;
            const known = new Set(s.posts.map((p) => p.id));
            return {
              ...s,
              pending: result.posts.filter((p) => !known.has(p.id)),
              pendingCount: result.count,
              pendingCursor: result.cursor,
            };
          }),
        () => {},
      );
    }, pollMs);
    return () => window.clearInterval(handle);
  }, [pollMs]);

  return { state, loadMore, reset, showPending };
}
