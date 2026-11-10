import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { teamRoom } from "./test-team-room";
import { useTeamRoom } from "./use-team-room";

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
  opened() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
}

const createSocket = (url: string, protocols: string[]) => new FakeSocket(url, protocols) as unknown as WebSocket;
const last = () => FakeSocket.instances[FakeSocket.instances.length - 1];

function setup() {
  const hook = renderHook(() => useTeamRoom("K7P2QX", "first-ticket", { refreshTicket: vi.fn(async () => "fresh"), createSocket }));
  act(() => last().opened());
  return hook;
}

beforeEach(() => {
  FakeSocket.instances = [];
});

describe("useTeamRoom (feature 039)", () => {
  it("reads team-state frames and their clock offset", () => {
    const { result } = setup();
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    act(() => last().receive({ type: "team-state", room: teamRoom({ phase: "countdown" }), serverNow: 3_000 }));
    expect(result.current.room?.phase).toBe("countdown");
    expect(result.current.offset).toBe(2_000);
    vi.restoreAllMocks();
  });

  it("sends the host's lobby frames", () => {
    const { result } = setup();
    act(() => {
      result.current.assign("lan", "B");
      result.current.order("A", ["minh", "hoa"]);
      result.current.shuffle();
      result.current.start();
      result.current.again();
    });
    expect(last().sent).toEqual([
      { type: "assign", userId: "lan", team: "B" },
      { type: "order", team: "A", ids: ["minh", "hoa"] },
      { type: "shuffle" },
      { type: "start" },
      { type: "again" },
    ]);
  });

  it("sends answers, hints and one typing signal for the open question only", () => {
    const { result } = setup();
    act(() => result.current.answer("happy"));
    expect(last().sent).toEqual([]);
    act(() => last().receive({ type: "team-state", room: teamRoom({ phase: "question", round: 1, number: 4, turn: { team: "A", userId: "minh" } }), serverNow: Date.now() }));
    act(() => {
      result.current.answer(" happy ");
      result.current.choose(2);
      result.current.hint();
      result.current.typingStarted();
      result.current.typingStarted();
    });
    expect(last().sent).toEqual([
      { type: "answer", q: 4, text: "happy" },
      { type: "choose", q: 4, choice: 2 },
      { type: "hint", q: 4 },
      { type: "typing", q: 4 },
    ]);
  });

  it("shows typing and wrong signals and room errors", () => {
    const { result } = setup();
    act(() => last().receive({ type: "typing", userId: "minh" }));
    act(() => last().receive({ type: "wrong", userId: "minh" }));
    act(() => last().receive({ type: "error", message: "Chưa đến lượt bạn." }));
    expect(result.current).toMatchObject({ typing: true, wrong: { userId: "minh", count: 1 }, error: "Chưa đến lượt bạn." });
  });
});
