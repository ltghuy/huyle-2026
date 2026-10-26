import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addAttendance } from "./attendance";
import { getAttemptsForItem, recordAnswer } from "./attempts";
import { getDueCards, putCards } from "./cards";
import { closeDb, compareKeys, getDb, isStorageAvailable, requestPersistence } from "./db";
import { makeAttempt, makeCard, resetStorage } from "./test-utils";

describe("getDb", () => {
  beforeEach(resetStorage);

  it("opens IndexedDB with the expected stores and indexes", async () => {
    expect(await isStorageAvailable()).toBe(true);
    await getDb();
    const request = indexedDB.open("learn-english");
    const db = await new Promise<IDBDatabase>((resolve) => (request.onsuccess = () => resolve(request.result)));
    expect([...db.objectStoreNames].toSorted()).toEqual(["attempts", "attendance", "cards", "content", "lessons", "meta"]);
    const tx = db.transaction(["cards", "attempts"]);
    expect([...tx.objectStore("cards").indexNames]).toEqual(["due"]);
    expect([...tx.objectStore("attempts").indexNames].toSorted()).toEqual(["at", "itemId_at"]);
    db.close();
  });
});

describe("in-memory fallback", () => {
  const original = globalThis.indexedDB;

  beforeEach(async () => {
    await closeDb();
    // @ts-expect-error simulating a browser without IndexedDB
    delete globalThis.indexedDB;
  });

  afterEach(async () => {
    await closeDb();
    globalThis.indexedDB = original;
  });

  it("keeps the repositories working for the session", async () => {
    expect(await isStorageAvailable()).toBe(false);
    await putCards([makeCard("word:a", 300), makeCard("word:b", 100)]);
    expect((await getDueCards(200)).map((card) => card.itemId)).toEqual(["word:b"]);
    await recordAnswer({ attempt: makeAttempt("1", "word:a", 20) });
    await recordAnswer({ attempt: makeAttempt("2", "word:a", 10) });
    await recordAnswer({ attempt: makeAttempt("3", "word:b", 15) });
    expect((await getAttemptsForItem("word:a")).map((a) => a.id)).toEqual(["2", "1"]);
    const row = { date: "2026-10-26", points: 10, bonus: 0, at: 1 };
    expect(await Promise.all([addAttendance(row), addAttendance(row)])).toEqual(["awarded", "already-awarded"]);
  });

  it("falls back when opening IndexedDB fails", async () => {
    globalThis.indexedDB = {
      open: () => {
        throw new DOMException("blocked", "InvalidStateError");
      },
    } as unknown as IDBFactory;
    expect(await isStorageAvailable()).toBe(false);
  });
});

describe("compareKeys", () => {
  it("orders numbers, strings and arrays like IndexedDB", () => {
    expect(compareKeys(5, "a")).toBeLessThan(0);
    expect(compareKeys("b", "a")).toBeGreaterThan(0);
    expect(compareKeys(["a", 1], ["a", 2])).toBeLessThan(0);
    expect(compareKeys(["a"], ["a", 0])).toBeLessThan(0);
    expect(compareKeys("z", ["a"])).toBeLessThan(0);
  });
});

describe("requestPersistence", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks the browser to persist storage", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("navigator", { storage: { persist, persisted: vi.fn().mockResolvedValue(false) } });
    expect(await requestPersistence()).toBe(true);
    expect(persist).toHaveBeenCalledOnce();
  });

  it("returns false when the API is missing or fails", async () => {
    vi.stubGlobal("navigator", {});
    expect(await requestPersistence()).toBe(false);
    vi.stubGlobal("navigator", { storage: { persist: vi.fn().mockRejectedValue(new Error("no")) } });
    expect(await requestPersistence()).toBe(false);
  });
});
