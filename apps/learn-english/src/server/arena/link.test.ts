// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkFrame } from "@/learning/arena/link";
import { LearnerLink, type Challenge } from "./link";

class FakeSocket {
  readyState = 1; // OPEN
  sent: LinkFrame[] = [];
  private attachment: unknown = null;
  send(text: string) {
    this.sent.push(JSON.parse(text) as LinkFrame);
  }
  serializeAttachment(value: unknown) {
    this.attachment = structuredClone(value);
  }
  deserializeAttachment() {
    return this.attachment;
  }
}

const CHALLENGE: Challenge = { from: { id: "evan", name: "Evan", image: null }, code: "R2KS89", settings: { mode: "mixed", level: "B1", rounds: 1, seconds: 15 } };

let sockets: FakeSocket[];
let hostReply: ReturnType<typeof vi.fn>;
let getByName: ReturnType<typeof vi.fn>;
let link: LearnerLink;

beforeEach(() => {
  sockets = [];
  hostReply = vi.fn();
  getByName = vi.fn(() => ({ reply: hostReply }));
  const ctx = {
    acceptWebSocket: (socket: FakeSocket) => void sockets.push(socket),
    getWebSockets: () => sockets.filter((socket) => socket.readyState === 1),
  };
  link = new LearnerLink(ctx as unknown as DurableObjectState, { LEARNER_LINK: { getByName } } as unknown as CloudflareEnv);
});

function connect(room: string | null = null) {
  const socket = new FakeSocket();
  link.accept(socket as unknown as WebSocket, "thu");
  if (room) void link.webSocketMessage(socket as unknown as WebSocket, JSON.stringify({ type: "room", code: room }));
  return socket;
}

describe("LearnerLink.deliver", () => {
  it("is offline with no open tab (AC-008)", () => {
    expect(link.deliver(CHALLENGE)).toBe("offline");
    const gone = connect();
    gone.readyState = 3;
    expect(link.deliver(CHALLENGE)).toBe("offline");
  });

  it("shows the challenge in every tab (AC-003)", () => {
    const a = connect();
    const b = connect();
    expect(link.deliver(CHALLENGE)).toBe("sent");
    expect(a.sent).toEqual([{ type: "challenge", ...CHALLENGE }]);
    expect(b.sent).toEqual(a.sent);
  });

  it("is busy when any tab has another room open (AC-007)", async () => {
    const free = connect();
    connect("ZZZZZZ");
    await Promise.resolve();
    expect(link.deliver(CHALLENGE)).toBe("busy");
    expect(free.sent).toEqual([]);
  });

  it("is free again once the room page is closed", async () => {
    const tab = connect("ZZZZZZ");
    await link.webSocketMessage(tab as unknown as WebSocket, JSON.stringify({ type: "room", code: null }));
    expect(link.deliver(CHALLENGE)).toBe("sent");
  });

  it("says when the friend already has this room open", async () => {
    connect("R2KS89");
    await Promise.resolve();
    expect(link.deliver(CHALLENGE)).toBe("here");
  });
});

describe("LearnerLink answers", () => {
  it("closes the toast in the other tabs and tells the host (AC-005, AC-006, AC-011)", async () => {
    const answering = connect();
    const other = connect();
    await link.webSocketMessage(answering as unknown as WebSocket, JSON.stringify({ type: "answer", hostId: "evan", code: "R2KS89", accept: false }));
    expect(other.sent).toEqual([{ type: "challenge-closed", hostId: "evan", code: "R2KS89" }]);
    expect(answering.sent).toEqual([]);
    expect(getByName).toHaveBeenCalledWith("evan");
    expect(hostReply).toHaveBeenCalledWith("thu", "R2KS89", false);
  });

  it("ignores frames it can't read", async () => {
    const tab = connect();
    await link.webSocketMessage(tab as unknown as WebSocket, "{nope");
    expect(hostReply).not.toHaveBeenCalled();
  });

  it("passes the host's cancel and the friend's reply to every tab", () => {
    const tab = connect();
    link.cancel("evan", "R2KS89");
    link.reply("thu", "R2KS89", true);
    expect(tab.sent).toEqual([
      { type: "challenge-closed", hostId: "evan", code: "R2KS89" },
      { type: "reply", friendId: "thu", code: "R2KS89", accept: true },
    ]);
  });
});
