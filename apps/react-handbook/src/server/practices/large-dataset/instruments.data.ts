import "server-only";

import { DATASET_SIZES, SECTORS, type DatasetSize, type Instrument } from "./instruments.schema";

// Deterministic instruments: row i depends only on i, so smaller datasets
// are prefixes of larger ones.

const NAME_START = [
  "Apex", "Blue", "Cedar", "Delta", "Echo", "Fjord", "Granite", "Harbor", "Iris", "Juniper",
  "Kite", "Lumen", "Maple", "Nova", "Orbit", "Pine", "Quartz", "River", "Summit", "Tide",
  "Umber", "Vertex", "Willow", "Xenon", "Yarrow", "Zephyr", "Ålborg", "Café", "Société", "Nørd",
];
const NAME_END: Record<(typeof SECTORS)[number], string[]> = {
  Technology: ["Systems", "Software", "Semiconductors", "Networks", "Cloud"],
  Financials: ["Bank", "Capital", "Insurance", "Payments", "Holdings"],
  "Health Care": ["Therapeutics", "Biotech", "Medical", "Health", "Diagnostics"],
  Energy: ["Energy", "Oil & Gas", "Solar", "Pipelines", "Power"],
  Industrials: ["Industries", "Aerospace", "Logistics", "Machinery", "Rail"],
  Utilities: ["Utilities", "Water", "Electric", "Gas", "Grid"],
  Materials: ["Materials", "Mining", "Chemicals", "Steel", "Paper"],
  "Real Estate": ["REIT", "Properties", "Realty", "Land", "Towers"],
  "Consumer Staples": ["Foods", "Beverages", "Grocers", "Household", "Farms"],
  "Consumer Discretionary": ["Retail", "Motors", "Apparel", "Leisure", "Hotels"],
  Communication: ["Media", "Telecom", "Studios", "Games", "Broadcasting"],
};
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const OPEN = Date.UTC(2026, 9, 8, 13, 30);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Unique per i: base-26 letters of i (3–4 long) plus a check letter. */
function symbolFor(i: number) {
  let n = i + 26 * 26; // at least 3 letters
  let s = "";
  while (n > 0) {
    s = LETTERS[n % 26] + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function instrument(i: number): Instrument {
  const random = rng(i * 2654435761 + 7);
  const sector = SECTORS[Math.floor(random() * SECTORS.length)];
  const ends = NAME_END[sector];
  const price = Math.round((5 + random() ** 2 * 995) * 100) / 100;
  return {
    // Not the position: the feed sends ids, so the board has to find them.
    id: (i * 7919 + 13) % 1_000_003,
    symbol: symbolFor(i),
    name: `${NAME_START[Math.floor(random() * NAME_START.length)]} ${ends[Math.floor(random() * ends.length)]}`,
    sector,
    price,
    change: Math.round((random() * 8 - 4) * 100) / 100,
    volume: Math.floor(random() ** 3 * 5_000_000),
    updatedAt: OPEN + Math.floor(random() * 3_600_000),
  };
}

let all: Instrument[] | undefined;
const bySize = new Map<DatasetSize, Instrument[]>();

export function getInstruments(size: DatasetSize) {
  let rows = bySize.get(size);
  if (!rows) {
    all ??= Array.from({ length: Math.max(...DATASET_SIZES) }, (_, i) => instrument(i));
    rows = all.slice(0, size);
    bySize.set(size, rows);
  }
  return rows;
}
