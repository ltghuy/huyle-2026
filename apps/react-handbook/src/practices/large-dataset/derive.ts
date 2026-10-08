import { foldText, searchTerms } from "@/server/practices/data-grid/grid.query";
import type { Instrument } from "@/server/practices/large-dataset/instruments.schema";

// The board's rows: filter, then sort. Pure; whether it runs on every render
// or only when its inputs change is the "cached filter and sort" switch.

export type SortColumn = "symbol" | "name" | "sector" | "price" | "change" | "volume" | "updatedAt";
export type Sort = { column: SortColumn; dir: "asc" | "desc" } | null;

/** Symbol, name and sector never change, so their folded text is kept by id. */
const haystacks = new Map<number, string>();

function haystack(row: Instrument) {
  let text = haystacks.get(row.id);
  if (text === undefined) {
    text = foldText(`${row.symbol}\n${row.name}\n${row.sector}`);
    haystacks.set(row.id, text);
  }
  return text;
}

const collator = new Intl.Collator("en", { sensitivity: "base" });

function compare(column: SortColumn, a: Instrument, b: Instrument) {
  switch (column) {
    case "name":
    case "sector":
      return collator.compare(a[column], b[column]);
    case "symbol":
      return a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0;
    default:
      return a[column] - b[column];
  }
}

export function derive(rows: readonly Instrument[], query: string, sort: Sort): Instrument[] {
  const terms = searchTerms(query);
  const matching = terms.length
    ? rows.filter((row) => {
        const text = haystack(row);
        return terms.every((term) => text.includes(term));
      })
    : rows.slice();
  if (!sort) return matching;
  const sign = sort.dir === "asc" ? 1 : -1;
  // Equal values keep a fixed order (by symbol), so rows don't swap between updates.
  return matching.sort((a, b) => sign * compare(sort.column, a, b) || (a.symbol < b.symbol ? -1 : 1));
}

/** Whether one instrument passes the filter (the details panel's "hidden" note). */
export function matchesQuery(row: Instrument, query: string) {
  const text = haystack(row);
  return searchTerms(query).every((term) => text.includes(term));
}
