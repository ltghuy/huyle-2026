import { vi } from "vitest";
import { formatSyncCode, normalizeSyncCode } from "@/server/sync/code";

interface Row {
  rev: number;
  data: string;
  updatedAt: number;
}

/**
 * An in-memory /api/sync behind a stubbed `fetch`, following the API
 * contract (POST 201, GET 200/404, PUT 200/409, DELETE 204/404). Tests can
 * edit `rows` to play another device, or set `offline` to make fetch reject.
 * `/api/progress` (feature 022) is served from `account` while `signedIn`
 * (GET 200/404, PUT 200/409 with rev 0 creating), and answers 401 otherwise.
 */
export function fakeSyncServer() {
  const rows = new Map<string, Row>();
  const calls: { method: string; url: string; code?: string; body?: unknown; keepalive?: boolean }[] = [];
  const state = { offline: false, next: 0, signedIn: true, account: undefined as Row | undefined };

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

  const fetchMock = vi.fn(async (url: RequestInfo | URL, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const headers = new Headers(init.headers);
    const raw = headers.get("x-sync-code");
    const body = init.body ? (JSON.parse(String(init.body)) as { data?: string; rev?: number }) : undefined;
    calls.push({ method, url: String(url), code: raw ?? undefined, body, keepalive: init.keepalive });
    if (state.offline) throw new TypeError("Failed to fetch");

    if (String(url) === "/api/progress") {
      if (!state.signedIn) return json({ error: { message: "sign in" } }, 401);
      const row = state.account;
      if (method === "GET") return row ? json(row) : json({ error: { message: "none" } }, 404);
      if (body!.rev !== (row?.rev ?? 0)) return json({ error: { message: "conflict" }, rev: row?.rev ?? 0 }, 409);
      state.account = { rev: (row?.rev ?? 0) + 1, data: body!.data!, updatedAt: Date.now() };
      return json({ rev: state.account.rev });
    }

    if (method === "POST") {
      const code = formatSyncCode(`TEST${String(state.next++).padStart(8, "0")}`);
      rows.set(normalizeSyncCode(code)!, { rev: 1, data: body!.data!, updatedAt: Date.now() });
      return json({ code, rev: 1 }, 201);
    }
    const key = raw ? normalizeSyncCode(raw) : null;
    if (!key) return json({ error: { message: "bad code" } }, 400);
    const row = rows.get(key);
    if (!row) return json({ error: { message: "not found" } }, 404);
    if (method === "GET") return json(row);
    if (method === "PUT") {
      if (body!.rev !== row.rev) return json({ error: { message: "conflict" }, rev: row.rev }, 409);
      const next = { rev: row.rev + 1, data: body!.data!, updatedAt: Date.now() };
      rows.set(key, next);
      return json({ rev: next.rev });
    }
    if (method === "DELETE") {
      rows.delete(key);
      return new Response(null, { status: 204 });
    }
    return json({ error: { message: "method" } }, 405);
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    rows,
    calls,
    fetchMock,
    get offline() {
      return state.offline;
    },
    set offline(value: boolean) {
      state.offline = value;
    },
    row(code: string) {
      return rows.get(normalizeSyncCode(code)!);
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
