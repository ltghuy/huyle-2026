import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addAiKey,
  addKeyError,
  AI_KEYS_KEY,
  getAiKeys,
  hasUsableAiKey,
  isAiKeyStorageBlocked,
  moveAiKey,
  removeAiKey,
  resetAiKeysForTest,
  subscribeAiKeys,
  updateAiKey,
} from "./ai-keys";

beforeEach(() => {
  localStorage.clear();
  resetAiKeysForTest();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ids = () => getAiKeys().map((key) => key.key);

describe("AI keys (033)", () => {
  it("adds trimmed keys in order and keeps them across reads (AC-002, AC-004)", () => {
    expect(addAiKey("  key-one\n")).toBe(true);
    expect(addAiKey("key-two")).toBe(true);
    expect(ids()).toEqual(["key-one", "key-two"]);
    expect(JSON.parse(localStorage.getItem(AI_KEYS_KEY)!)).toHaveLength(2);
    resetAiKeysForTest();
    expect(ids()).toEqual(["key-one", "key-two"]);
    expect(getAiKeys()).toBe(getAiKeys()); // stable for useSyncExternalStore
  });

  it("refuses empty, duplicate and a sixth key", () => {
    expect(addKeyError("   ")).toBe("empty");
    addAiKey("a");
    expect(addKeyError(" a ")).toBe("duplicate");
    expect(addAiKey("a")).toBe(false);
    for (const key of ["b", "c", "d", "e"]) addAiKey(key);
    expect(addKeyError("f")).toBe("full");
    expect(ids()).toHaveLength(5);
  });

  it("moves, updates and removes keys (AC-003, AC-006)", () => {
    for (const key of ["a", "b", "c"]) addAiKey(key);
    const [a, b] = getAiKeys();
    moveAiKey(b!.id, -1);
    expect(ids()).toEqual(["b", "a", "c"]);
    moveAiKey(b!.id, -1); // already first
    expect(ids()).toEqual(["b", "a", "c"]);
    updateAiKey(a!.id, { status: "invalid", reasonVi: "Sai" });
    expect(getAiKeys()[1]).toMatchObject({ key: "a", status: "invalid", reasonVi: "Sai" });
    removeAiKey(a!.id);
    removeAiKey(b!.id);
    expect(hasUsableAiKey()).toBe(true);
    removeAiKey(getAiKeys()[0]!.id);
    expect(ids()).toEqual([]);
    expect(localStorage.getItem(AI_KEYS_KEY)).toBeNull();
    expect(hasUsableAiKey()).toBe(false);
  });

  it("has no usable key while every key is paused or invalid", () => {
    addAiKey("a");
    const now = Date.now();
    updateAiKey(getAiKeys()[0]!.id, { status: "quota", skipUntil: now + 1000 });
    expect(hasUsableAiKey(now)).toBe(false);
    expect(hasUsableAiKey(now + 1000)).toBe(true);
  });

  it("tells listeners about changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAiKeys(listener);
    addAiKey("a");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    addAiKey("b");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps keys in memory when storage is blocked", () => {
    const fail = () => {
      throw new Error("SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: fail, setItem: fail, removeItem: fail });
    expect(isAiKeyStorageBlocked()).toBe(true);
    addAiKey("a");
    expect(ids()).toEqual(["a"]);
  });

  it("reads a broken stored value as no keys", () => {
    localStorage.setItem(AI_KEYS_KEY, "{not json");
    expect(getAiKeys()).toEqual([]);
  });
});
