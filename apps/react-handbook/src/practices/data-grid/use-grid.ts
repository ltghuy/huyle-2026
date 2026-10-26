import { useEffect, useState, useSyncExternalStore } from "react";

import { VIEW_PARAM_KEYS, viewToSearchParams, type DatasetSize, type GridView, type QueryResult } from "@/server/practices/data-grid/grid.schema";

import { fetchDataset, fetchQuery } from "./grid-api";
import { GridController } from "./grid-controller";

/** One controller per mounted demo; downloaded datasets are shared and outlive it. */
export function useGridController(initialView: GridView, initialResult: QueryResult, initialSize: DatasetSize) {
  const [controller] = useState(
    () => new GridController({ initialView, initialResult, initialSize, fetchDataset, fetchQuery }),
  );
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);

  useUrlView(snapshot.view);
  return { controller, snapshot };
}

/**
 * Mirrors the view into the query string with replaceState: a reload or a
 * shared link shows the same grid, and no history entry is added per change.
 */
function useUrlView(view: GridView) {
  const query = viewToSearchParams(view).toString();
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const key of VIEW_PARAM_KEYS) url.searchParams.delete(key);
    for (const [key, value] of new URLSearchParams(query)) url.searchParams.set(key, value);
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
  }, [query]);
}
