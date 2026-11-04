// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { RoomStatus } from "./room";
import { CODE_ALPHABET, createRoom, joinRoom, playerName, randomCode } from "./arena.service";
import { verifyTicket } from "./ticket";

const SECRET = "s".repeat(32);
const NOW = 1_800_000_000_000;
const MINH = { id: "minh", name: "Minh Anh", email: "minh@example.com", image: "https://example.test/minh.png" };
const SETTINGS = { mode: "mixed", level: "A1", rounds: 3 } as const;

function rooms(stub: { create?: (input: unknown) => Promise<boolean>; status?: () => Promise<RoomStatus | null> }) {
  const getByName = vi.fn(() => stub);
  return { rooms: { getByName } as unknown as CloudflareEnv["ARENA_ROOM"], getByName };
}

describe("randomCode", () => {
  it("makes 6-character codes without look-alike letters", () => {
    for (let i = 0; i < 200; i++) {
      const code = randomCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      expect(code).not.toMatch(/[01OIL]/);
      expect([...code].every((char) => CODE_ALPHABET.includes(char))).toBe(true);
    }
  });
});

describe("playerName", () => {
  it("uses the chosen name when it passes the board rules, else the Google name", () => {
    expect(playerName("Minh", MINH)).toBe("Minh");
    expect(playerName("   ", MINH)).toBe("Minh Anh");
    expect(playerName(undefined, MINH)).toBe("Minh Anh");
  });
});

describe("createRoom (AC-002, AC-003)", () => {
  it("claims a code, seats the creator and returns a ticket for that room", async () => {
    const create = vi.fn(async () => true);
    const { rooms: namespace, getByName } = rooms({ create });
    const room = await createRoom(namespace, { settings: SETTINGS, user: MINH, name: "Minh", secret: SECRET, now: NOW });
    expect(room).toMatchObject({ code: expect.stringMatching(/^[A-Z2-9]{6}$/), settings: SETTINGS });
    expect(getByName).toHaveBeenCalledWith(room!.code);
    expect(create).toHaveBeenCalledWith({ code: room!.code, settings: SETTINGS, creator: { id: "minh", name: "Minh", image: MINH.image } });
    expect(await verifyTicket(room!.ticket, SECRET, room!.code, NOW)).toMatchObject({ uid: "minh", name: "Minh" });
  });

  it("tries another code when one is taken, and gives up after 5", async () => {
    const create = vi.fn(async () => false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect(await createRoom(rooms({ create }).rooms, { settings: SETTINGS, user: MINH, name: "Minh", secret: SECRET, now: NOW })).not.toBeNull();
    expect(create).toHaveBeenCalledTimes(2);

    const never = vi.fn(async () => false);
    expect(await createRoom(rooms({ create: never }).rooms, { settings: SETTINGS, user: MINH, name: "Minh", secret: SECRET, now: NOW })).toBeNull();
    expect(never).toHaveBeenCalledTimes(5);
  });
});

describe("joinRoom (AC-004, AC-005)", () => {
  const LAN = { id: "lan", name: "Lan", email: "lan@example.com", image: null };
  const status = (phase: RoomStatus["phase"], playerIds: string[]): RoomStatus => ({ phase, creatorId: "minh", playerIds, settings: SETTINGS });
  const join = (room: RoomStatus | null, user = LAN) => joinRoom(rooms({ status: async () => room }).rooms, { code: "K7P2QX", user, name: user.name, secret: SECRET, now: NOW });

  it("hands a ticket and the room's settings to the second player", async () => {
    const result = await join(status("lobby", ["minh"]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatchObject({ code: "K7P2QX", settings: SETTINGS });
  });

  it("says why it can't join an unknown, full or started room", async () => {
    expect(await join(null)).toEqual({ ok: false, reason: "not-found" });
    expect(await join(status("ready", ["minh", "khoa"]))).toEqual({ ok: false, reason: "full" });
    expect(await join(status("question", ["minh", "khoa"]))).toEqual({ ok: false, reason: "full" });
  });

  it("always lets a seated player back in, even mid-match", async () => {
    expect((await join(status("paused", ["minh", "lan"]))).ok).toBe(true);
  });
});
