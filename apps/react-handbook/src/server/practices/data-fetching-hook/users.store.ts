import "server-only";
import type { PatchUser, UserDetail, UserSummary } from "./users.schema";

const NAMES = [
  "Mai Nguyen", "Lukas Becker", "Aisha Khan", "Diego Alvarez", "Hana Sato",
  "Omar Haddad", "Chloé Martin", "Ravi Patel", "Sofia Rossi", "Jonas Berg",
  "Amara Okafor", "Kenji Watanabe", "Ghost User", "Lena Fischer", "Mateo Silva",
  "Priya Shah", "Noah Kim", "Elif Yılmaz", "Tomás Novák", "Ingrid Larsen",
];
const ROLES = ["Engineer", "Designer", "Product", "Support", "Data"];
const TEAMS = ["engineering", "design", "product", "support", "data"];

// u-13 is listed but "deleted on the server": its detail returns 404.
const DELETED = new Set(["u-13"]);

const users = new Map<string, UserDetail>(
  NAMES.map((name, i) => {
    const id = `u-${i + 1}`;
    const handle = name.toLowerCase().split(" ")[0].normalize("NFD").replace(/\p{M}/gu, "");
    return [
      id,
      {
        id,
        name,
        role: ROLES[i % ROLES.length],
        favorite: i % 4 === 0,
        email: `${handle}@example.com`,
        bio: `${name} works in ${TEAMS[i % TEAMS.length]} and joined in ${2018 + (i % 7)}.`,
        updatedAt: new Date(Date.UTC(2026, 9, 1, 9, i)).toISOString(),
      },
    ];
  }),
);

function summary({ id, name, role, favorite }: UserDetail): UserSummary {
  return { id, name, role, favorite };
}

export function listUsers(): UserSummary[] {
  return [...users.values()].map(summary);
}

export function getUser(id: string): UserDetail | null {
  if (DELETED.has(id)) return null;
  return users.get(id) ?? null;
}

export function patchUser(id: string, patch: PatchUser): UserDetail | null {
  const user = getUser(id);
  if (!user) return null;
  const next = { ...user, ...patch, updatedAt: new Date().toISOString() };
  users.set(id, next);
  return next;
}

export async function simulateNetwork(latencyMs: number, failRate: number) {
  const wait = latencyMs === -1 ? 100 + Math.random() * 1900 : latencyMs;
  await new Promise((resolve) => setTimeout(resolve, wait));
  return Math.random() >= failRate;
}
