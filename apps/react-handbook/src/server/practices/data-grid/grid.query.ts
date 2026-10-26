import {
  COLUMNS,
  type ColumnId,
  type Employee,
  type Filters,
  type GridView,
  type QueryResult,
  type SelectionInput,
  type SortKey,
} from "./grid.schema";

// The grid's whole query, as one pure function: filter → sort → page. The
// browser (browser mode) and the mock API (server mode) both call it, so the
// two modes can't disagree. Client-safe: no `server-only`.

const MARKS = /\p{M}/gu;
const SPACES = /\s+/g;
/** Letters NFD doesn't split into base + mark. */
const EXTRA_FOLDS: Record<string, string> = { ø: "o", æ: "ae", œ: "oe", ß: "ss", ł: "l", đ: "d", ı: "i" };

function foldChar(char: string) {
  const lower = char.toLowerCase();
  return EXTRA_FOLDS[lower] ?? lower.normalize("NFD").replace(MARKS, "");
}

/** Lowercase, strip accents, collapse and trim spaces. */
export function foldText(text: string) {
  let out = "";
  for (const char of text) out += foldChar(char);
  return out.replace(SPACES, " ").trim();
}

export function searchTerms(search: string) {
  return foldText(search).split(" ").filter(Boolean);
}

const SEARCHABLE = COLUMNS.filter((c) => c.searchable).map((c) => c.id);
const haystacks = new WeakMap<Employee, string>();

/** Folded searchable text, one column per line so a word can't span two. */
function haystack(employee: Employee) {
  let value = haystacks.get(employee);
  if (value === undefined) {
    value = SEARCHABLE.map((id) => foldText(String(employee[id]))).join("\n");
    haystacks.set(employee, value);
  }
  return value;
}

export type FilterErrors = { salary?: string; startDate?: string };

export function filterErrors(filters: Filters): FilterErrors {
  const errors: FilterErrors = {};
  if (filters.salaryMin !== undefined && filters.salaryMax !== undefined && filters.salaryMin > filters.salaryMax) {
    errors.salary = "Minimum is above maximum";
  }
  if (filters.startFrom && filters.startTo && filters.startFrom > filters.startTo) {
    errors.startDate = "“From” is after “to”";
  }
  return errors;
}

/** The filters that actually apply: impossible ranges are ignored, text is folded. */
function effectiveFilters(filters: Filters): Filters {
  const errors = filterErrors(filters);
  const out: Filters = { ...filters };
  if (errors.salary) {
    delete out.salaryMin;
    delete out.salaryMax;
  }
  if (errors.startDate) {
    delete out.startFrom;
    delete out.startTo;
  }
  if (out.role !== undefined) {
    const role = foldText(out.role);
    if (role) out.role = role;
    else delete out.role;
  }
  return out;
}

function matches(employee: Employee, terms: string[], f: Filters) {
  if (f.department && employee.department !== f.department) return false;
  if (f.location && employee.location !== f.location) return false;
  if (f.status && employee.status !== f.status) return false;
  if (f.salaryMin !== undefined && employee.salary < f.salaryMin) return false;
  if (f.salaryMax !== undefined && employee.salary > f.salaryMax) return false;
  if (f.startFrom && employee.startDate < f.startFrom) return false;
  if (f.startTo && employee.startDate > f.startTo) return false;
  if (f.ratingMin !== undefined && (employee.rating === null || employee.rating < f.ratingMin)) return false;
  if (f.role && !foldText(employee.role).includes(f.role)) return false;
  if (terms.length) {
    const text = haystack(employee);
    if (!terms.every((term) => text.includes(term))) return false;
  }
  return true;
}

/**
 * Identifies "the rows matching this search + these filters": two views with
 * the same key match the same rows. Used to tie an "all matching" selection
 * to the filter it was made under.
 */
export function filterKey(view: Pick<GridView, "search" | "filters">) {
  const f = effectiveFilters(view.filters);
  const sorted = Object.fromEntries(Object.entries(f).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify([searchTerms(view.search).join(" "), sorted]);
}

export function hasActiveFilter(view: Pick<GridView, "search" | "filters">) {
  return filterKey(view) !== filterKey({ search: "", filters: {} });
}

// --- Sorting ------------------------------------------------------------------

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === "";
}

function compareValues(column: ColumnId, a: Employee, b: Employee) {
  const x = a[column];
  const y = b[column];
  if (typeof x === "number" && typeof y === "number") return x - y;
  // Text and ISO dates; dates compare correctly as strings.
  return column === "startDate" ? (x! < y! ? -1 : x! > y! ? 1 : 0) : collator.compare(String(x), String(y));
}

/** Multi-key comparator: empty values last in both directions, then id. */
export function compareBy(sort: SortKey[]) {
  return (a: Employee, b: Employee) => {
    for (const { column, dir } of sort) {
      const aEmpty = isEmpty(a[column]);
      const bEmpty = isEmpty(b[column]);
      if (aEmpty || bEmpty) {
        if (aEmpty && bEmpty) continue;
        return aEmpty ? 1 : -1;
      }
      const diff = compareValues(column, a, b);
      if (diff !== 0) return dir === "asc" ? diff : -diff;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}

// --- Query --------------------------------------------------------------------

const indexes = new WeakMap<readonly Employee[], Map<string, Employee>>();

function byId(rows: readonly Employee[]) {
  let index = indexes.get(rows);
  if (!index) {
    index = new Map(rows.map((r) => [r.id, r]));
    indexes.set(rows, index);
  }
  return index;
}

export function queryEmployees(
  all: readonly Employee[],
  view: GridView,
  selection?: SelectionInput,
  onlySelected = false,
): QueryResult {
  const terms = searchTerms(view.search);
  const filters = effectiveFilters(view.filters);

  let isPicked: (e: Employee) => boolean = () => true;
  if (onlySelected) {
    if (!selection) isPicked = () => false;
    else if (selection.kind === "ids") {
      const ids = new Set(selection.ids);
      isPicked = (e) => ids.has(e.id);
    } else {
      const except = new Set(selection.except);
      isPicked = (e) => !except.has(e.id);
    }
  }

  const matching = all.filter((e) => isPicked(e) && matches(e, terms, filters));
  const sorted = view.sort.length ? matching.sort(compareBy(view.sort)) : matching;

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / view.pageSize));
  const page = Math.min(Math.max(1, view.page), pageCount);
  const start = (page - 1) * view.pageSize;

  const matchedSelectedIds: string[] = [];
  if (selection?.kind === "ids") {
    const index = byId(all);
    for (const id of selection.ids) {
      const employee = index.get(id);
      if (employee && matches(employee, terms, filters)) matchedSelectedIds.push(id);
    }
  }

  return { rows: sorted.slice(start, start + view.pageSize), total, page, pageCount, matchedSelectedIds };
}

// --- Highlighting ---------------------------------------------------------------

export type Range = [start: number, end: number];

/**
 * Where `terms` occur in `text`, as ranges of the original string. Folds per
 * character and keeps a map back to the original index, because folding can
 * change the length ("æ" → "ae").
 */
export function highlightRanges(text: string, terms: string[]): Range[] {
  if (!terms.length || !text) return [];
  let folded = "";
  const origin: number[] = [];
  let i = 0;
  for (const char of text) {
    for (const f of foldChar(char)) {
      folded += f;
      origin.push(i);
    }
    i += char.length;
  }
  const ranges: Range[] = [];
  for (const term of terms) {
    let at = folded.indexOf(term);
    while (at !== -1) {
      const lastOrigin = origin[at + term.length - 1];
      const lastChar = text.codePointAt(lastOrigin)! > 0xffff ? 2 : 1;
      ranges.push([origin[at], lastOrigin + lastChar]);
      at = folded.indexOf(term, at + 1);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

/** Ids of every row matching the view's search + filters, in dataset order. */
export function matchingIds(all: readonly Employee[], view: Pick<GridView, "search" | "filters">) {
  const terms = searchTerms(view.search);
  const filters = effectiveFilters(view.filters);
  return all.filter((e) => matches(e, terms, filters)).map((e) => e.id);
}
