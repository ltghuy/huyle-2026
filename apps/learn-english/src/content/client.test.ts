import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getContentCache, putContentCache } from "@/storage/content";
import { resetStorage } from "@/storage/test-utils";
import {
  ContentUnavailableError,
  VERSION_TTL_MS,
  getContentVersion,
  isTombstoned,
  loadContent,
  loadTombstones,
  refreshIfChanged,
  resetContentClient,
  withoutTombstoned,
} from "./client";

const word = (id: string) => ({ id, kind: "word", level: "A1", sort: 0, body: { headword: id } });

/** A fake content API: the current version and the items each version serves. */
function fakeServer() {
  const state = {
    version: 1,
    items: { 1: [word("word:apple")], 2: [word("word:apple"), word("word:book")] } as Record<number, unknown[]>,
    tombstones: { 1: [], 2: ["word:cat"] } as Record<number, string[]>,
    offline: false,
    serverError: false,
  };
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    if (state.offline) throw new TypeError("Failed to fetch");
    if (state.serverError) return Response.json({ error: { message: "lỗi" } }, { status: 503 });
    const url = new URL(String(input), "https://english.huyle.work");
    if (url.pathname === "/api/content/version") {
      return Response.json({ version: state.version, publishedAt: 1 });
    }
    const v = Number(url.searchParams.get("v"));
    if (v !== state.version) {
      return Response.json({ error: { message: "cũ" }, version: state.version }, { status: 409 });
    }
    return Response.json({ version: v, items: state.items[v] ?? [], tombstones: state.tombstones[v] ?? [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  const calls = (path: string) => fetchMock.mock.calls.filter(([input]) => String(input).startsWith(path)).length;
  return { state, fetchMock, calls };
}

describe("content client", () => {
  let server: ReturnType<typeof fakeServer>;

  beforeEach(async () => {
    await resetStorage();
    resetContentClient();
    server = fakeServer();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("downloads a kind/level once and serves it from IndexedDB while the version holds", async () => {
    const first = await loadContent("word", "A1");
    expect(first).toEqual({ items: [word("word:apple")], version: 1, stale: false });
    expect(server.fetchMock).toHaveBeenCalledWith("/api/content/items?kind=word&level=A1&v=1", expect.anything());

    const stored = await getContentCache("word", "A1");
    expect(stored).toMatchObject({ version: 1, items: [word("word:apple")], tombstones: [] });
    expect(stored?.fetchedAt).toBeTypeOf("number");

    await loadContent("word", "A1");
    expect(server.calls("/api/content/items")).toBe(1);
    expect(server.calls("/api/content/version")).toBe(1);
  });

  it("keys kinds without a level as 'all'", async () => {
    server.state.items[1] = [{ id: "grammar:be", kind: "grammar", level: "A1", sort: 0, body: {} }];
    await loadContent("grammar");
    expect(server.fetchMock).toHaveBeenCalledWith("/api/content/items?kind=grammar&v=1", expect.anything());
    expect(await getContentCache("grammar", "all")).toMatchObject({ version: 1 });
  });

  it("memoises the version for five minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    await getContentVersion();
    await getContentVersion();
    expect(server.calls("/api/content/version")).toBe(1);

    vi.setSystemTime(Date.now() + VERSION_TTL_MS + 1);
    await getContentVersion();
    expect(server.calls("/api/content/version")).toBe(2);
  });

  it("refetches the items after a version change (AC-052)", async () => {
    await loadContent("word", "A1");
    server.state.version = 2;

    expect(await refreshIfChanged()).toBe(true);
    const next = await loadContent("word", "A1");
    expect(next).toEqual({ items: [word("word:apple"), word("word:book")], version: 2, stale: false });
    expect(await getContentCache("word", "A1")).toMatchObject({ version: 2, tombstones: ["word:cat"] });
    expect(await refreshIfChanged()).toBe(false);
  });

  it("retries once with the version from a 409", async () => {
    await getContentVersion(); // memoises version 1
    server.state.version = 2;

    const loaded = await loadContent("word", "A1");
    expect(loaded.version).toBe(2);
    expect(server.fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      "/api/content/version",
      "/api/content/items?kind=word&level=A1&v=1",
      "/api/content/items?kind=word&level=A1&v=2",
    ]);
    expect(await getContentVersion()).toBe(2);
  });

  it("uses the last download when offline, flagged stale (AC-055)", async () => {
    await putContentCache("word", "A1", { version: 1, items: [word("word:apple")], tombstones: [], fetchedAt: 1 });
    server.state.version = 2;
    server.state.offline = true;

    expect(await loadContent("word", "A1")).toEqual({ items: [word("word:apple")], version: 1, stale: true });
  });

  it("uses the last download on a server error, flagged stale (AC-055)", async () => {
    await loadContent("word", "A1");
    resetContentClient();
    server.state.serverError = true;

    expect(await loadContent("word", "A1")).toMatchObject({ version: 1, stale: true });
  });

  it("throws ContentUnavailableError when there is nothing downloaded (AC-055)", async () => {
    server.state.offline = true;
    const error = await loadContent("word", "B1").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ContentUnavailableError);
    expect(error).toMatchObject({ kind: "word", level: "B1" });
  });

  it("never throws from refreshIfChanged while offline", async () => {
    server.state.offline = true;
    expect(await refreshIfChanged()).toBe(false);
  });

  it("hides tombstoned ids (AC-054)", async () => {
    server.state.version = 2;
    await loadContent("word", "A1");

    expect(isTombstoned("word:cat")).toBe(true);
    expect(isTombstoned("word:apple")).toBe(false);
    expect(withoutTombstoned([{ id: "word:cat" }, { id: "word:apple" }])).toEqual([{ id: "word:apple" }]);
  });

  it("collects tombstones from every stored kind/level", async () => {
    await putContentCache("word", "A1", { version: 1, items: [], tombstones: ["word:cat"], fetchedAt: 1 });
    await putContentCache("grammar", "all", { version: 1, items: [], tombstones: ["grammar:old"], fetchedAt: 1 });

    const removed = await loadTombstones();
    expect([...removed].sort()).toEqual(["grammar:old", "word:cat"]);
    expect(isTombstoned("grammar:old")).toBe(true);
  });

  it("un-hides an item that is published again", async () => {
    await putContentCache("word", "A1", { version: 0, items: [], tombstones: ["word:apple"], fetchedAt: 1 });
    await loadTombstones();
    expect(isTombstoned("word:apple")).toBe(true);

    await loadContent("word", "A1");
    expect(isTombstoned("word:apple")).toBe(false);
  });
});
