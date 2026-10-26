"use client";

import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { hashKey } from "./hash-key";
import { queryClient, type Fetcher, type QueryKey, type QueryState } from "./query-client";

const SERVER_STATE = queryClient.getState("__server__");

export type QueryResult<T> = QueryState<T> & {
  /** First load in progress (no data yet). */
  isLoading: boolean;
  /** Any request in progress, including background refreshes. */
  isFetching: boolean;
  refetch: () => void;
};

/**
 * Reads `key` from the shared cache. Subscribing is what registers this
 * component as a user of the key, so React's mount/unmount/key-change
 * lifecycle drives fetching, cancellation and garbage collection.
 */
export function useQuery<T>(key: QueryKey, fetcher: Fetcher<T>): QueryResult<T> {
  const hash = hashKey(key);
  const keyRef = useRef(key);
  const fetcherRef = useRef(fetcher);

  // Layout effects run before the store subscription, so the refs are current.
  useLayoutEffect(() => {
    keyRef.current = key;
    fetcherRef.current = fetcher;
  });

  const subscribe = useCallback(
    (listener: () => void) =>
      queryClient.subscribe(
        hash,
        keyRef.current,
        () => fetcherRef.current as Fetcher<unknown>,
        listener,
      ),
    // The hash is the identity of the key; re-subscribe only when it changes.
    [hash],
  );
  const getSnapshot = useCallback(() => queryClient.getState(hash), [hash]);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE) as QueryState<T>;
  const refetch = useCallback(() => queryClient.refetch(hash), [hash]);

  return {
    ...state,
    isLoading: state.status === "loading" && state.dataUpdatedAt === 0,
    isFetching: state.fetchStatus !== "idle",
    refetch,
  };
}
