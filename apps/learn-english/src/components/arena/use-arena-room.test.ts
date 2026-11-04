import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLOSE_CODES, type RoomFrame } from "@/learning/arena/protocol";
import { publicRoom } from "./test-room";
import { CONNECTION_MESSAGES, RECONNECT_DELAYS, useArenaRoom } from "./use-arena-room";
import { msLeft } from "./use-countdown";

class FakeSocket {
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor(
    readonly url: string,
    readonly protocols: string[],
  ) {
    FakeSocket.instances.push(this);
  }
  send(text: string) {
    this.sent.push(JSON.parse(text));
  }
  close() {
    this.readyState = 3;
  }
  // Test controls
  opened() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(frame: RoomFrame | string) {
    this.onmessage?.({ data: typeof frame === "string" ? frame : JSON.stringify(frame) });
  }
  dropped(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

const createSocket = (url: string, protocols: string[]) => new FakeSocket(url, protocols) as unknown as WebSocket;
const last = () => FakeSocket.instances[FakeSocket.instances.length - 1];

function setup(refreshTicket = vi.fn(async () => "fresh-ticket")) {
  const hook = renderHook(() => useArenaRoom("K7P2QX", "first-ticket", { refreshTicket, createSocket }));
  return { ...hook, refreshTicket };
}

beforeEach(() => {
  FakeSocket.instances = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("useArenaRoom", () => {
  it("opens the room's socket with the ticket as subprotocol, not in the URL", () => {
    setup();
    expect(last().url).toBe("ws://localhost:3000/api/arena/socket?code=K7P2QX");
    expect(last().protocols).toEqual(["arena", "first-ticket"]);
    expect(last().url).not.toContain("ticket");
  });

  it("follows the room's state frames and keeps the clock offset", () => {
    const { result } = setup();
    act(() => last().opened());
    vi.setSystemTime(1_000_000);
    act(() => last().receive({ type: "state", room: publicRoom({ phase: "ready", deadline: 1_032_500 }), serverNow: 1_002_500 }));
    expect(result.current.status).toBe("open");
    expect(result.current.room?.phase).toBe("ready");
    expect(result.current.offset).toBe(2_500);
    // The room says 30 s are left; this device's clock is 2.5 s behind.
    expect(msLeft(result.current.room!.deadline, result.current.offset, 1_000_000)).toBe(30_000);
  });

  it("ignores frames that aren't valid", () => {
    const { result } = setup();
    act(() => last().opened());
    act(() => last().receive("not json"));
    act(() => last().receive(JSON.stringify({ type: "state", room: { phase: "bogus" }, serverNow: 1 })));
    expect(result.current.room).toBeNull();
  });

  it("shows the opponent typing until the next question, and counts wrong answers", () => {
    const { result } = setup();
    act(() => last().opened());
    act(() => last().receive({ type: "state", room: publicRoom({ phase: "question", round: 1, questionIndex: 0 }), serverNow: Date.now() }));
    act(() => last().receive({ type: "typing", userId: "lan" }));
    expect(result.current.typing).toEqual(["lan"]);
    act(() => last().receive({ type: "wrong", userId: "lan" }));
    act(() => last().receive({ type: "wrong", userId: "lan" }));
    expect(result.current.wrong).toEqual({ userId: "lan", count: 2 });
    act(() => last().receive({ type: "state", room: publicRoom({ phase: "question", round: 1, questionIndex: 1 }), serverNow: Date.now() }));
    expect(result.current.typing).toEqual([]);
  });

  it("sends answers for the open question, and typing once per question", () => {
    const { result } = setup();
    act(() => last().opened());
    act(() => last().receive({ type: "state", room: publicRoom({ phase: "question", round: 1, questionIndex: 4 }), serverNow: Date.now() }));
    act(() => {
      result.current.typingStarted();
      result.current.typingStarted();
      result.current.answer("  apple ");
      result.current.choose(2);
      result.current.answer("   ");
    });
    expect(last().sent).toEqual([
      { type: "typing", q: 4 },
      { type: "answer", q: 4, text: "apple" },
      { type: "choose", q: 4, choice: 2 },
    ]);
  });

  it("reconnects with a fresh ticket after a drop", async () => {
    const { result, refreshTicket } = setup();
    act(() => last().opened());
    act(() => last().dropped());
    expect(result.current.status).toBe("reconnecting");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECONNECT_DELAYS[0]);
    });
    expect(refreshTicket).toHaveBeenCalledTimes(1);
    expect(last().protocols).toEqual(["arena", "fresh-ticket"]);
    act(() => last().opened());
    expect(result.current.status).toBe("open");
  });

  it("gives up after the last try, with a message", async () => {
    const { result } = setup(vi.fn(async () => Promise.reject(new Error("offline"))));
    act(() => last().opened());
    act(() => last().dropped());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECONNECT_DELAYS.reduce((a, b) => a + b, 0) + 1_000);
    });
    expect(result.current.status).toBe("closed");
    expect(result.current.error).toBe(CONNECTION_MESSAGES.lost);
  });

  it("stops for good when the room closes or another tab takes over", () => {
    const { result } = setup();
    act(() => last().opened());
    act(() => last().receive({ type: "error", message: "Phòng đã đóng." }));
    act(() => last().dropped(CLOSE_CODES.roomClosed));
    expect(result.current).toMatchObject({ status: "closed", error: "Phòng đã đóng." });

    const second = setup();
    act(() => last().opened());
    act(() => last().dropped(CLOSE_CODES.replaced));
    expect(second.result.current).toMatchObject({ status: "closed", error: CONNECTION_MESSAGES.replaced });
    expect(FakeSocket.instances).toHaveLength(2);
  });
});
