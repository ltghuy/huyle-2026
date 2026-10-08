import type { Instrument } from "@/server/practices/large-dataset/instruments.schema";

// The simulated market feed. An update names instruments by id, like a real
// feed would; the board has to find each one in its list. Updates are always
// immutable (new array, new objects for changed rows only), so every
// optimization sees the same data and `memo` can compare by identity.

export type Update = Pick<Instrument, "id" | "price" | "change" | "volume" | "updatedAt">;

/** mulberry32: seeded, so a benchmark replays the same updates. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** `batch` random instruments move by up to ±0.5%. */
export function nextUpdates(rows: readonly Instrument[], batch: number, random: () => number, now: number): Update[] {
  const updates: Update[] = [];
  for (let i = 0; i < batch && rows.length; i++) {
    const row = rows[Math.floor(random() * rows.length)];
    const open = row.price / (1 + row.change / 100);
    const price = Math.max(0.01, round2(row.price * (1 + (random() - 0.5) * 0.01)));
    updates.push({
      id: row.id,
      price,
      change: round2((price / open - 1) * 100),
      volume: row.volume + Math.floor(random() * 5_000),
      updatedAt: now,
    });
  }
  return updates;
}

export type IdIndex = ReadonlyMap<number, number>;

/** id → position, built once per dataset (positions never change). */
export function buildIndex(rows: readonly Instrument[]): IdIndex {
  return new Map(rows.map((row, i) => [row.id, i]));
}

/**
 * Applies updates. With an index each lookup is O(1); without one, each
 * update scans the list (`findIndex`): O(rows × updates).
 */
export function applyUpdates(rows: readonly Instrument[], updates: readonly Update[], index: IdIndex | null): Instrument[] {
  const next = rows.slice();
  for (const update of updates) {
    const at = index ? (index.get(update.id) ?? -1) : next.findIndex((row) => row.id === update.id);
    if (at !== -1) next[at] = { ...next[at], ...update };
  }
  return next;
}
