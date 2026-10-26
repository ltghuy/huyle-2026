import "server-only";

import {
  DATASET_SIZES,
  DEPARTMENTS,
  LOCATIONS,
  type DatasetSize,
  type Department,
  type Employee,
  type Status,
} from "./grid.schema";

// Deterministic employee directory. Row i depends only on i, so the
// 1,000-row dataset is exactly the first 1,000 rows of the 10,000-row one and
// selected ids stay valid when the learner switches size.

const FIRST_NAMES = [
  "Aiden", "Amélie", "Ana", "Anh", "Arjun", "Beatriz", "Ben", "Chloé", "Chen", "Dara",
  "Elena", "Emeka", "Farah", "François", "Grace", "Hana", "Hiroshi", "Ingrid", "Isabel", "Jae-won",
  "James", "José", "Julia", "Kofi", "Lars", "Léa", "Linh", "Lucas", "Maya", "Mehmet",
  "Mia", "Minh", "Nadia", "Noah", "Olu", "Priya", "Rafael", "Sara", "Søren", "Thảo",
  "Tom", "Uma", "Victor", "Wei", "Yasmin", "Yuki", "Zoë", "Łukasz", "Ömer", "Inès",
];

const LAST_NAMES = [
  "Adeyemi", "Andersen", "Bauer", "Bianchi", "Brown", "Carvalho", "Chen", "Costa", "Dubois", "Eriksen",
  "Fernández", "García", "Gupta", "Hansen", "Ito", "Jansen", "Kim", "Kowalski", "Le", "López",
  "Martin", "Müller", "Nakamura", "Nguyen", "Novak", "O'Brien", "Okafor", "Park", "Patel", "Pérez",
  "Rossi", "Santos", "Schmidt", "Silva", "Smith", "Søndergaard", "Tanaka", "Tran", "Van Dijk", "Wang",
  "Weber", "Williams", "Wong", "Yılmaz", "Zhang", "Ødegaard", "Đặng", "Çelik", "Åberg", "Johnson",
];

const TITLES: Record<Department, string[]> = {
  Engineering: ["Frontend Engineer", "Backend Engineer", "Platform Engineer", "QA Engineer", "Data Engineer"],
  Design: ["Product Designer", "UX Researcher", "Brand Designer"],
  Product: ["Product Manager", "Technical Product Manager", "Product Analyst"],
  Marketing: ["Content Marketer", "Growth Marketer", "Marketing Analyst"],
  Sales: ["Account Executive", "Sales Engineer", "Sales Development Rep"],
  Finance: ["Financial Analyst", "Accountant", "Controller"],
  People: ["Recruiter", "People Partner", "People Ops Specialist"],
  Support: ["Support Specialist", "Support Engineer", "Customer Success Manager"],
};

const BASE_SALARY: Record<Department, number> = {
  Engineering: 95_000, Design: 80_000, Product: 90_000, Marketing: 65_000,
  Sales: 60_000, Finance: 70_000, People: 60_000, Support: 50_000,
};

const START = Date.UTC(2010, 0, 1);
const END = Date.UTC(2026, 8, 30);
const DAY = 86_400_000;
const NEW_HIRE_SINCE = "2025-10-01";

/** mulberry32: a tiny seeded PRNG, so each row is reproducible. */
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

function pickFrom<T>(list: readonly T[], r: number) {
  return list[Math.floor(r * list.length)];
}

function employee(i: number): Employee {
  const random = rng(i * 2654435761 + 1);
  const department = pickFrom(DEPARTMENTS, random());
  const band = 1 + Math.floor(random() * 12);
  const startDate = new Date(START + Math.floor(random() * ((END - START) / DAY)) * DAY).toISOString().slice(0, 10);
  const roll = random();
  const status: Status = roll < 0.8 ? "Active" : roll < 0.88 ? "On leave" : "Contractor";
  const newHire = startDate >= NEW_HIRE_SINCE || random() < 0.03;
  const r = random();
  const rating = newHire ? null : r < 0.05 ? 1 : r < 0.2 ? 2 : r < 0.55 ? 3 : r < 0.85 ? 4 : 5;
  const salary = Math.round((BASE_SALARY[department] + band * 7_500 + random() * 20_000) / 500) * 500;
  return {
    id: `E${String(i + 1).padStart(5, "0")}`,
    name: `${pickFrom(FIRST_NAMES, random())} ${pickFrom(LAST_NAMES, random())}`,
    department,
    role: `${pickFrom(TITLES[department], random())} ${band}`,
    location: pickFrom(LOCATIONS, random()),
    salary,
    startDate,
    status,
    rating,
  };
}

let all: Employee[] | undefined;
const bySize = new Map<DatasetSize, Employee[]>();

/** The same array instance per size, so per-array indexes stay cached. */
export function getEmployees(size: DatasetSize): Employee[] {
  let rows = bySize.get(size);
  if (!rows) {
    all ??= Array.from({ length: Math.max(...DATASET_SIZES) }, (_, i) => employee(i));
    rows = all.slice(0, size);
    bySize.set(size, rows);
  }
  return rows;
}
