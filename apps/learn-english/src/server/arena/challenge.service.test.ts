// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LINK_CODE } from "@/learning/arena/link";
import { socialDb } from "@/test-utils/social-db";
import { respond, sendRequest } from "@/server/social/friends.service";
import type { RoomStatus } from "./room";
import { cancelChallenge, linkTicket, sendChallenge } from "./challenge.service";
import { verifyTicket } from "./ticket";

const NOW = Date.parse("2026-11-09T10:00:00Z");
const SECRET = "s".repeat(32);
const SETTINGS = { mode: "mixed", level: "B1", rounds: 1, seconds: 15 } as const;
const HOST = { id: "minh", name: "Minh", image: null };
const LOBBY: RoomStatus = { phase: "lobby", creatorId: "minh", playerIds: ["minh"], spectatorIds: [], settings: SETTINGS };

let handle: ReturnType<typeof socialDb>;
let status: RoomStatus | null;
let deliver: ReturnType<typeof vi.fn>;
let cancel: ReturnType<typeof vi.fn>;
let linkByName: ReturnType<typeof vi.fn>;

const rooms = () => ({ getByName: () => ({ status: async () => status }) }) as unknown as CloudflareEnv["ARENA_ROOM"];
const links = () => ({ getByName: linkByName }) as unknown as CloudflareEnv["LEARNER_LINK"];
const challenge = (friendId = "lan") => sendChallenge(handle.db, rooms(), links(), { code: "R2KS89", friendId, host: HOST });

beforeEach(async () => {
  handle = socialDb(NOW);
  await sendRequest(handle.db, "minh", "lan", NOW);
  await respond(handle.db, "lan", "minh", true, NOW);
  status = LOBBY;
  deliver = vi.fn(async () => "sent");
  cancel = vi.fn(async () => {});
  linkByName = vi.fn(() => ({ deliver, cancel }));
});

describe("sendChallenge (feature 035)", () => {
  it("delivers to the friend's link with the room's settings (AC-003)", async () => {
    expect(await challenge()).toEqual({ ok: true, state: "sent" });
    expect(linkByName).toHaveBeenCalledWith("lan");
    expect(deliver).toHaveBeenCalledWith({ from: HOST, code: "R2KS89", settings: SETTINGS });
  });

  it("passes on what the link found (AC-007, AC-008)", async () => {
    deliver.mockResolvedValueOnce("busy");
    expect(await challenge()).toEqual({ ok: true, state: "busy" });
  });

  it("refuses someone who isn't a friend", async () => {
    expect(await challenge("ghost")).toEqual({ ok: false, reason: "not-friend" });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("refuses a room the caller doesn't host, or that isn't waiting", async () => {
    for (const next of [null, { ...LOBBY, creatorId: "lan" }, { ...LOBBY, phase: "question" as const }]) {
      status = next;
      expect(await challenge()).toEqual({ ok: false, reason: "not-host" });
    }
    expect(deliver).not.toHaveBeenCalled();
  });

  it("refuses when the seat is taken, unless the friend is the one in it", async () => {
    status = { ...LOBBY, playerIds: ["minh", "thu"] };
    expect(await challenge()).toEqual({ ok: false, reason: "seat-taken" });
    status = { ...LOBBY, playerIds: ["minh", "lan"] };
    expect(await challenge()).toEqual({ ok: true, state: "here" });
    expect(deliver).not.toHaveBeenCalled();
  });
});

describe("cancelChallenge", () => {
  it("closes the toast in the friend's tabs, in the caller's name (AC-010)", async () => {
    await cancelChallenge(links(), { code: "R2KS89", friendId: "lan", hostId: "minh" });
    expect(cancel).toHaveBeenCalledWith("minh", "R2KS89");
  });
});

describe("linkTicket", () => {
  it("is signed for the link code only", async () => {
    const { ticket } = await linkTicket({ id: "minh", name: "Minh Anh", email: "m@example.com", image: null }, SECRET, NOW);
    expect((await verifyTicket(ticket, SECRET, LINK_CODE, NOW))?.uid).toBe("minh");
    expect(await verifyTicket(ticket, SECRET, "R2KS89", NOW)).toBeNull();
  });
});
