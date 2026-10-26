import { afterEach, describe, expect, it, vi } from "vitest";
import { closeBroadcast, notifyChanged, subscribeChanges, type ChangedMessage } from "./broadcast";
import { putLesson } from "./lessons";
import { resetStorage } from "./test-utils";

function nextMessage(): Promise<{ message: ChangedMessage; unsubscribe: () => void }> {
  return new Promise((resolve) => {
    const unsubscribe = subscribeChanges((message) => resolve({ message, unsubscribe }));
  });
}

describe("broadcast", () => {
  afterEach(() => {
    closeBroadcast();
    vi.unstubAllGlobals();
  });

  it("delivers change messages to subscribers", async () => {
    const received = nextMessage();
    notifyChanged(["cards", "attempts"]);
    const { message, unsubscribe } = await received;
    unsubscribe();
    expect(message).toEqual({ type: "changed", stores: ["cards", "attempts"] });
  });

  it("announces repository writes", async () => {
    await resetStorage();
    const received = nextMessage();
    await putLesson({ date: "2026-10-26", contentVersion: 1, plan: [], position: { part: 0, index: 0 }, updatedAt: 1 });
    const { message, unsubscribe } = await received;
    unsubscribe();
    expect(message.stores).toEqual(["lessons"]);
  });

  it("is a no-op without BroadcastChannel", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    expect(() => notifyChanged(["cards"])).not.toThrow();
    const unsubscribe = subscribeChanges(() => {});
    expect(unsubscribe).not.toThrow();
  });
});
