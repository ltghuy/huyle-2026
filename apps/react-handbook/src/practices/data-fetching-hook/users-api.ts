import type {
  PatchUser,
  UserDetail,
  UserSummary,
} from "@/server/practices/data-fetching-hook/users.schema";

import { HttpError, type QueryKey } from "./query-client";

const BASE = "/api/practices/data-fetching-hook/users";

/** Read at request time, so demo controls apply to the next request. */
export const network = {
  /** -1 = random 100–2000 ms. */
  latencyMs: 600,
  failRate: 0,
  saveFailRate: 0,
};

export const usersKey: QueryKey = ["users"];
export const userKey = (id: string): QueryKey => ["user", { id }];

export function isUsersKey(key: QueryKey) {
  return key[0] === "users";
}

export function isUserKey(id: string) {
  return (key: QueryKey) =>
    key[0] === "user" && (key[1] as { id?: string } | undefined)?.id === id;
}

async function request<T>(path: string, failRate: number, init?: RequestInit): Promise<T> {
  const params = new URLSearchParams({
    latencyMs: String(network.latencyMs),
    failRate: String(failRate),
  });
  const res = await fetch(`${BASE}${path}?${params}`, init);
  const json = await res.json();
  if (!res.ok) throw new HttpError(res.status, json.error?.message ?? `HTTP ${res.status}`);
  return json.data as T;
}

export function fetchUsers({ signal }: { signal: AbortSignal }) {
  return request<UserSummary[]>("", network.failRate, { signal });
}

export function fetchUser(id: string) {
  return ({ signal }: { signal: AbortSignal }) =>
    request<UserDetail>(`/${id}`, network.failRate, { signal });
}

export function patchUser(id: string, patch: PatchUser) {
  return request<UserDetail>(`/${id}`, network.saveFailRate, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
}
