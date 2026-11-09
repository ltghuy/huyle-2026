import { vi } from "vitest";

interface Row {
  rev: number;
  data: string;
  updatedAt: number;
}

/**
 * An in-memory `/api/progress` (feature 022) behind a stubbed `fetch`, served from `account`
 * while `signedIn` (GET 200/404, PUT 200/409 with rev 0 creating), and 401 otherwise. Tests can
 * edit `account` to play another device, or set `offline` to make fetch reject.
 */
export function fakeSyncServer() {
  const calls: { method: string; url: string; body?: unknown; keepalive?: boolean }[] = [];
  const state = { offline: false, signedIn: true, account: undefined as Row | undefined };

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  const fetchMock = vi.fn(async (url: RequestInfo | URL, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const body = init.body ? (JSON.parse(String(init.body)) as { data?: string; rev?: number }) : undefined;
    calls.push({ method, url: String(url), body, keepalive: init.keepalive });
    if (state.offline) throw new TypeError("Failed to fetch");
    if (String(url) !== "/api/progress") return json({ error: { message: "not here" } }, 404);
    if (!state.signedIn) return json({ error: { message: "sign in" } }, 401);
    const row = state.account;
    if (method === "GET") return row ? json(row) : json({ error: { message: "none" } }, 404);
    if (body!.rev !== (row?.rev ?? 0)) return json({ error: { message: "conflict" }, rev: row?.rev ?? 0 }, 409);
    state.account = { rev: (row?.rev ?? 0) + 1, data: body!.data!, updatedAt: Date.now() };
    return json({ rev: state.account.rev });
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    calls,
    fetchMock,
    get offline() {
      return state.offline;
    },
    set offline(value: boolean) {
      state.offline = value;
    },
    get account() {
      return state.account;
    },
    set account(row: Row | undefined) {
      state.account = row;
    },
    get signedIn() {
      return state.signedIn;
    },
    set signedIn(value: boolean) {
      state.signedIn = value;
    },
  };
}
