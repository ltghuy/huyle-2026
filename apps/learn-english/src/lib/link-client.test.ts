import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLink, LINK_RECONNECT_DELAYS } from "./link-client";

class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 0;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(
    readonly url: string,
    readonly protocols: string[],
  ) {
    FakeSocket.all.push(this);
  }
  send(text: string) {
    this.sent.push(JSON.parse(text));
  }
  close() {
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
}

const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.all = [];
});
afterEach(() => vi.useRealTimers());

function makeLink(getTicket = vi.fn(async () => "t1")) {
  const link = createLink({ getTicket, url: () => "ws://x/api/arena/link/socket", createSocket: (url, protocols) => new FakeSocket(url, protocols) as unknown as WebSocket });
  return { link, getTicket };
}

describe("link client (feature 035)", () => {
  it("opens with the ticket as the subprotocol and passes frames to listeners", async () => {
    const { link } = makeLink();
    const listener = vi.fn();
    link.subscribe(listener);
    link.start();
    await flush();
    const socket = FakeSocket.all[0];
    expect(socket.protocols).toEqual(["arena", "t1"]);
    socket.open();
    socket.onmessage?.({ data: JSON.stringify({ type: "challenge-closed", hostId: "u1", code: "R2KS89" }) });
    socket.onmessage?.({ data: "junk" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reconnects after a drop with a fresh ticket and reports the open room again", async () => {
    const { link, getTicket } = makeLink();
    link.start();
    await flush();
    FakeSocket.all[0].open();
    link.setRoom("R2KS89");
    expect(FakeSocket.all[0].sent).toEqual([{ type: "room", code: "R2KS89" }]);
    FakeSocket.all[0].drop();
    await vi.advanceTimersByTimeAsync(LINK_RECONNECT_DELAYS[0]);
    expect(getTicket).toHaveBeenCalledTimes(2);
    FakeSocket.all[1].open();
    expect(FakeSocket.all[1].sent).toEqual([{ type: "room", code: "R2KS89" }]);
  });

  it("retries when the ticket can't be fetched, and stops for good on stop()", async () => {
    const getTicket = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue("t2");
    const { link } = makeLink(getTicket);
    link.start();
    await flush();
    expect(FakeSocket.all).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(LINK_RECONNECT_DELAYS[0]);
    expect(FakeSocket.all).toHaveLength(1);
    link.stop();
    FakeSocket.all[0].drop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeSocket.all).toHaveLength(1);
  });

  it("sends answers only while open", async () => {
    const { link } = makeLink();
    link.start();
    await flush();
    expect(link.answer("u1", "R2KS89", true)).toBe(false);
    FakeSocket.all[0].open();
    expect(link.answer("u1", "R2KS89", true)).toBe(true);
    expect(FakeSocket.all[0].sent).toEqual([{ type: "answer", hostId: "u1", code: "R2KS89", accept: true }]);
  });
});
