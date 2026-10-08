import { z } from "zod";

// Shared by the page, the mock API and the client grid (no `server-only`):
// the view a URL describes, the API body, and the columns all come from here.

export const DEPARTMENTS = ["Engineering", "Design", "Product", "Marketing", "Sales", "Finance", "People", "Support"] as const;
export const LOCATIONS = [
  "Amsterdam", "Berlin", "Hanoi", "Ho Chi Minh City", "London",
  "New York", "São Paulo", "Seoul", "Singapore", "Toronto",
] as const;
export const STATUSES = ["Active", "On leave", "Contractor"] as const;

export type Department = (typeof DEPARTMENTS)[number];
export type Location = (typeof LOCATIONS)[number];
export type Status = (typeof STATUSES)[number];

export type Employee = {
  id: string;
  name: string;
  department: Department;
  role: string;
  location: Location;
  /** Whole dollars per year. */
  salary: number;
  /** Calendar date `YYYY-MM-DD`; no time, so no time-zone shifts. */
  startDate: string;
  status: Status;
  /** 1–5, or null for new hires. */
  rating: number | null;
};

export const DATASET_SIZES = [1000, 10000] as const;
export type DatasetSize = (typeof DATASET_SIZES)[number];

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const MAX_SORT_KEYS = 3;
export const MAX_TEXT_LENGTH = 100;
export const MAX_SALARY = 1_000_000;

export type ColumnId = "name" | "department" | "role" | "location" | "salary" | "startDate" | "status" | "rating";
export type ColumnType = "text" | "number" | "date" | "rating";

export type Column = {
  id: ColumnId;
  label: string;
  type: ColumnType;
  /** Pixels. */
  defaultWidth: number;
  /** Text columns are searched by the search box. */
  searchable: boolean;
};

export const COLUMNS: readonly Column[] = [
  { id: "name", label: "Name", type: "text", defaultWidth: 200, searchable: true },
  { id: "department", label: "Department", type: "text", defaultWidth: 150, searchable: true },
  { id: "role", label: "Role", type: "text", defaultWidth: 240, searchable: true },
  { id: "location", label: "Location", type: "text", defaultWidth: 150, searchable: true },
  { id: "salary", label: "Salary", type: "number", defaultWidth: 120, searchable: false },
  { id: "startDate", label: "Start date", type: "date", defaultWidth: 130, searchable: false },
  { id: "status", label: "Status", type: "text", defaultWidth: 130, searchable: true },
  { id: "rating", label: "Rating", type: "rating", defaultWidth: 100, searchable: false },
];

export const COLUMN_IDS = COLUMNS.map((c) => c.id) as [ColumnId, ...ColumnId[]];
export const MIN_COLUMN_WIDTH = 64;
export const MAX_COLUMN_WIDTH = 600;

export type SortDir = "asc" | "desc";
export type SortKey = { column: ColumnId; dir: SortDir };

export type Filters = {
  department?: Department;
  location?: Location;
  status?: Status;
  /** "Contains", case- and accent-insensitive. */
  role?: string;
  salaryMin?: number;
  salaryMax?: number;
  startFrom?: string;
  startTo?: string;
  ratingMin?: number;
};

export type GridView = {
  sort: SortKey[];
  search: string;
  filters: Filters;
  /** 1-based; the query clamps it to the last page. */
  page: number;
  pageSize: PageSize;
};

export const DEFAULT_VIEW: GridView = { sort: [], search: "", filters: {}, page: 1, pageSize: 25 };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in `YYYY-MM-DD`. */
export function isIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const text = z.string().trim().max(MAX_TEXT_LENGTH);
const salary = z.number().int().min(0).max(MAX_SALARY);
const isoDate = z.string().refine(isIsoDate, "Expected a date as YYYY-MM-DD");

const sortKeySchema = z.object({ column: z.enum(COLUMN_IDS), dir: z.enum(["asc", "desc"]) });

export const filtersSchema = z.object({
  department: z.enum(DEPARTMENTS).optional(),
  location: z.enum(LOCATIONS).optional(),
  status: z.enum(STATUSES).optional(),
  role: text.optional(),
  salaryMin: salary.optional(),
  salaryMax: salary.optional(),
  startFrom: isoDate.optional(),
  startTo: isoDate.optional(),
  ratingMin: z.number().int().min(1).max(5).optional(),
});

export const gridViewSchema = z.object({
  sort: z.array(sortKeySchema).max(MAX_SORT_KEYS),
  search: z.string().max(MAX_TEXT_LENGTH),
  filters: filtersSchema,
  page: z.number().int().min(1).max(100_000),
  pageSize: z.union(PAGE_SIZES.map((n) => z.literal(n))),
});

const ids = z.array(z.string().max(16)).max(10_000);

export const selectionInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ids"), ids }),
  z.object({ kind: z.literal("all"), except: ids }),
]);
export type SelectionInput = z.infer<typeof selectionInputSchema>;

export const queryBodySchema = z.object({
  size: z.union(DATASET_SIZES.map((n) => z.literal(n))),
  view: gridViewSchema,
  selection: selectionInputSchema.optional(),
  onlySelected: z.boolean().default(false),
  latencyMs: z.number().int().min(0).max(5000).default(0),
  failRate: z.number().min(0).max(1).default(0),
});
export type QueryBody = z.infer<typeof queryBodySchema>;

export const datasetParamsSchema = z.object({
  size: z.coerce.number().pipe(z.union(DATASET_SIZES.map((n) => z.literal(n)))).default(1000),
  latencyMs: z.coerce.number().int().min(0).max(5000).default(0),
});

export type QueryResult = {
  /** The requested page's rows. */
  rows: Employee[];
  /** Rows matching search + filters (+ "only selected"). */
  total: number;
  /** The page actually returned (clamped). */
  page: number;
  pageCount: number;
  /** The sent explicit selection ids that match search + filters. */
  matchedSelectedIds: string[];
};

// --- URL <-> view -----------------------------------------------------------
// Lenient: each invalid field falls back to its default instead of rejecting
// the whole link.

type Params = Record<string, string | string[] | undefined>;

const URL_KEYS = {
  sort: "sort", search: "q", department: "dept", location: "loc", status: "status", role: "role",
  salaryMin: "salMin", salaryMax: "salMax", startFrom: "from", startTo: "to", ratingMin: "rating",
  page: "page", pageSize: "per",
} as const;

function first(params: Params, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
}

function parseSort(raw: string | undefined): SortKey[] {
  if (!raw) return [];
  const keys: SortKey[] = [];
  for (const part of raw.split(",")) {
    const [column, dir] = part.split(".");
    const parsed = sortKeySchema.safeParse({ column, dir });
    if (!parsed.success || keys.some((k) => k.column === parsed.data.column)) continue;
    keys.push(parsed.data);
    if (keys.length === MAX_SORT_KEYS) break;
  }
  return keys;
}

function parseInt10(raw: string | undefined) {
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined;
  return Number(raw);
}

function pick<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseViewParams(params: Params): GridView {
  const get = (key: keyof typeof URL_KEYS) => first(params, URL_KEYS[key]);
  const filters: Filters = {
    department: pick(z.enum(DEPARTMENTS), get("department")),
    location: pick(z.enum(LOCATIONS), get("location")),
    status: pick(z.enum(STATUSES), get("status")),
    role: pick(text.min(1), get("role")),
    salaryMin: pick(salary, parseInt10(get("salaryMin"))),
    salaryMax: pick(salary, parseInt10(get("salaryMax"))),
    startFrom: pick(isoDate, get("startFrom")),
    startTo: pick(isoDate, get("startTo")),
    ratingMin: pick(z.number().int().min(1).max(5), parseInt10(get("ratingMin"))),
  };
  for (const key of Object.keys(filters) as (keyof Filters)[]) {
    if (filters[key] === undefined) delete filters[key];
  }
  const pageSize = parseInt10(get("pageSize"));
  return {
    sort: parseSort(get("sort")),
    search: (get("search") ?? "").slice(0, MAX_TEXT_LENGTH),
    filters,
    page: Math.max(1, Math.min(100_000, parseInt10(get("page")) ?? 1)),
    pageSize: PAGE_SIZES.find((n) => n === pageSize) ?? DEFAULT_VIEW.pageSize,
  };
}

/** Only non-default values, in a stable order. */
export function viewToSearchParams(view: GridView): URLSearchParams {
  const params = new URLSearchParams();
  if (view.sort.length) params.set(URL_KEYS.sort, view.sort.map((k) => `${k.column}.${k.dir}`).join(","));
  if (view.search.trim()) params.set(URL_KEYS.search, view.search);
  for (const key of Object.keys(view.filters).sort() as (keyof Filters)[]) {
    const value = view.filters[key];
    if (value !== undefined && value !== "") params.set(URL_KEYS[key], String(value));
  }
  if (view.page !== 1) params.set(URL_KEYS.page, String(view.page));
  if (view.pageSize !== DEFAULT_VIEW.pageSize) params.set(URL_KEYS.pageSize, String(view.pageSize));
  return params;
}

/** Every URL key the grid owns, so syncing can remove stale ones. */
export const VIEW_PARAM_KEYS: readonly string[] = Object.values(URL_KEYS);
