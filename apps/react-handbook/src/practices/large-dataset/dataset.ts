import type { DatasetSize, Instrument } from "@/server/practices/large-dataset/instruments.schema";

/** Module-level: each size is downloaded once and reused across visits. */
const cache = new Map<DatasetSize, Promise<Instrument[]>>();

export function loadDataset(size: DatasetSize): Promise<Instrument[]> {
  let promise = cache.get(size);
  if (!promise) {
    promise = fetch(`/api/practices/large-dataset/instruments?size=${size}`)
      .catch(() => {
        throw new Error("Can't reach the server. Check your connection and retry.");
      })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? `Loading failed (HTTP ${res.status}).`);
        return json.data as Instrument[];
      });
    // A failed load must not stay cached: Retry fetches again.
    promise.catch(() => cache.delete(size));
    cache.set(size, promise);
  }
  return promise;
}
