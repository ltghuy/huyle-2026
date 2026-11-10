import { beforeEach, describe, expect, it, vi } from "vitest";

let signedIn = true;
let throttled = false;
vi.mock("@/server/auth/session", () => ({
  requireUser: async () =>
    signedIn
      ? { user: { id: "minh", name: "Minh Anh", email: "minh@example.com", image: null } }
      : { response: Response.json({ error: { message: "Bạn cần đăng nhập để tiếp tục." } }, { status: 401 }) },
}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env: { ARENA_ROOM: {}, LEARNER_LINK: {} } }) }));
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));
vi.mock("@/server/env", () => ({ getArenaEnv: () => ({ ARENA_SECRET: "s".repeat(32) }) }));
vi.mock("@/server/arena/request", async (original) => ({
  ...(await original<typeof import("@/server/arena/request")>()),
  isThrottled: async () => throttled,
}));
vi.mock("@/server/social/request", async (original) => ({
  ...(await original<typeof import("@/server/social/request")>()),
  isThrottled: async () => throttled,
}));
const createRoom = vi.fn();
const createTeamRoom = vi.fn();
const joinRoom = vi.fn();
vi.mock("@/server/arena/arena.service", async (original) => ({
  ...(await original<typeof import("@/server/arena/arena.service")>()),
  createRoom: (...args: unknown[]) => createRoom(...args),
  createTeamRoom: (...args: unknown[]) => createTeamRoom(...args),
  joinRoom: (...args: unknown[]) => joinRoom(...args),
}));
const getStats = vi.fn();
vi.mock("@/server/arena/stats", () => ({ getStats: (...args: unknown[]) => getStats(...args) }));
const listHistory = vi.fn();
vi.mock("@/server/arena/history", () => ({ listHistory: (...args: unknown[]) => listHistory(...args) }));

const sendChallenge = vi.fn();
const cancelChallenge = vi.fn();
vi.mock("@/server/arena/challenge.service", async (original) => ({
  ...(await original<typeof import("@/server/arena/challenge.service")>()),
  sendChallenge: (...args: unknown[]) => sendChallenge(...args),
  cancelChallenge: (...args: unknown[]) => cancelChallenge(...args),
}));

const rooms = await import("./rooms/route");
const teams = await import("./teams/route");
const challenges = await import("./challenges/route");
const cancel = await import("./challenges/cancel/route");
const link = await import("./link/route");
const join = await import("./join/route");
const stats = await import("./stats/route");
const matches = await import("./matches/route");

const post = (route: { POST: (r: Request) => Promise<Response> }, body: unknown) =>
  route.POST(new Request("https://english.huyle.work/api/arena", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const TICKET = { code: "K7P2QX", ticket: "t.s", settings: { mode: "mixed", level: "A1", rounds: 3 } };

beforeEach(() => {
  signedIn = true;
  throttled = false;
  createRoom.mockReset();
  joinRoom.mockReset();
  getStats.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/arena/rooms", () => {
  it("refuses guests (AC-006)", async () => {
    signedIn = false;
    expect((await post(rooms, { mode: "mixed", level: "A1", rounds: 3 })).status).toBe(401);
  });

  it("refuses settings outside the choices (AC-002)", async () => {
    expect((await post(rooms, { mode: "mixed", level: "A1", rounds: 2 })).status).toBe(422);
  });

  it("is throttled per IP", async () => {
    throttled = true;
    expect((await post(rooms, { mode: "mixed", level: "A1", rounds: 3 })).status).toBe(429);
  });

  it("returns the code and ticket with 201, using the chosen name", async () => {
    createRoom.mockResolvedValue(TICKET);
    const response = await post(rooms, { mode: "mixed", level: "A1", rounds: 3, name: "Minh" });
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(TICKET);
    expect(createRoom.mock.calls[0][1]).toMatchObject({ settings: { mode: "mixed", level: "A1", rounds: 3 }, name: "Minh" });
  });

  it("answers 503 when no code is free or the room fails", async () => {
    createRoom.mockResolvedValue(null);
    expect((await post(rooms, { mode: "mixed", level: "A1", rounds: 3 })).status).toBe(503);
    createRoom.mockRejectedValue(new Error("down"));
    expect((await post(rooms, { mode: "mixed", level: "A1", rounds: 3 })).status).toBe(503);
  });
});

describe("POST /api/arena/teams (feature 039)", () => {
  const TEAM = { mode: "recall", level: "A2", rounds: 1, seconds: 25, size: 6, minutes: 10 };

  it("refuses guests and settings outside the choices (AC-002, AC-006)", async () => {
    expect((await post(teams, { ...TEAM, size: 11 })).status).toBe(422);
    expect((await post(teams, { ...TEAM, minutes: 20 })).status).toBe(422);
    signedIn = false;
    expect((await post(teams, TEAM)).status).toBe(401);
  });

  it("creates a team room with the chosen name and answers its ticket", async () => {
    const ticket = { kind: "team", code: "K7P2QX", ticket: "t.s", settings: TEAM };
    createTeamRoom.mockResolvedValue(ticket);
    const response = await post(teams, { ...TEAM, name: "Minh" });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(ticket);
    expect(createTeamRoom.mock.calls[0][1]).toMatchObject({ settings: TEAM, name: "Minh" });
  });

  it("is throttled, and answers 503 when the room fails", async () => {
    createTeamRoom.mockRejectedValue(new Error("down"));
    expect((await post(teams, TEAM)).status).toBe(503);
    throttled = true;
    expect((await post(teams, TEAM)).status).toBe(429);
  });
});

describe("POST /api/arena/join", () => {
  it("forgives case and spaces in a typed code", async () => {
    joinRoom.mockResolvedValue({ ok: true, value: TICKET });
    const response = await post(join, { code: "k7p 2qx" });
    expect(response.status).toBe(200);
    expect(joinRoom.mock.calls[0][1]).toMatchObject({ code: "K7P2QX" });
  });

  it("refuses a malformed code", async () => {
    expect((await post(join, { code: "K7P2Q0" })).status).toBe(422);
  });

  it("says in Vietnamese why it can't join (AC-005)", async () => {
    for (const [reason, status, message] of [
      ["not-found", 404, "Không tìm thấy phòng. Bạn kiểm tra lại mã nhé."],
      ["full", 409, "Phòng đã đủ người."],
      ["started", 409, "Trận đấu đã bắt đầu, bạn không vào được nữa."],
    ] as const) {
      joinRoom.mockResolvedValue({ ok: false, reason });
      const response = await post(join, { code: "K7P2QX" });
      expect(response.status).toBe(status);
      expect(((await response.json()) as { error: { message: string } }).error.message).toBe(message);
    }
  });
});

describe("GET /api/arena/stats", () => {
  it("refuses guests and returns the learner's record (AC-030)", async () => {
    signedIn = false;
    expect((await stats.GET(new Request("https://english.huyle.work/api/arena/stats"))).status).toBe(401);
    signedIn = true;
    getStats.mockResolvedValue({ wins: 3, losses: 1, streak: 2, bestStreak: 3 });
    const response = await stats.GET(new Request("https://english.huyle.work/api/arena/stats"));
    expect(await response.json()).toEqual({ wins: 3, losses: 1, streak: 2, bestStreak: 3 });
    expect(getStats.mock.calls[0][1]).toBe("minh");
  });
});

describe("GET /api/arena/matches (feature 025)", () => {
  const get = (url = "https://english.huyle.work/api/arena/matches?userId=lan") => matches.GET(new Request(url));

  it("refuses guests (AC-007)", async () => {
    signedIn = false;
    expect((await get()).status).toBe(401);
    expect(listHistory).not.toHaveBeenCalled();
  });

  it("returns only the signed-in learner's record and matches, never cached", async () => {
    listHistory.mockReset().mockResolvedValue({ stats: { wins: 1, losses: 0, streak: 1, bestStreak: 1 }, matches: [] });
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ stats: { wins: 1, losses: 0, streak: 1, bestStreak: 1 }, matches: [] });
    // The query string's user id is ignored: it is always the session's.
    expect(listHistory.mock.calls[0][1]).toBe("minh");
  });

  it("answers 503 in Vietnamese when the database fails (AC-008)", async () => {
    listHistory.mockReset().mockRejectedValue(new Error("D1 down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await get();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { message: "Đấu trường đang tạm nghỉ, bạn thử lại sau nhé." } });
  });
});

describe("challenges (feature 035)", () => {
  beforeEach(() => {
    sendChallenge.mockReset();
    cancelChallenge.mockReset();
  });

  it("refuses guests and bad bodies", async () => {
    expect((await post(challenges, { code: "K7P2QX", friendId: "" })).status).toBe(422);
    expect((await post(challenges, { code: "nope", friendId: "lan" })).status).toBe(422);
    signedIn = false;
    expect((await post(challenges, { code: "K7P2QX", friendId: "lan" })).status).toBe(401);
    expect((await post(cancel, { code: "K7P2QX", friendId: "lan" })).status).toBe(401);
    expect((await post(link, {})).status).toBe(401);
  });

  it("sends as the signed-in host with their chosen name and answers the delivery state", async () => {
    sendChallenge.mockResolvedValue({ ok: true, state: "busy" });
    const response = await post(challenges, { code: "K7P2QX", friendId: "lan", name: "Minh" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "busy" });
    expect(sendChallenge.mock.calls[0][3]).toEqual({ code: "K7P2QX", friendId: "lan", host: { id: "minh", name: "Minh", image: null } });
  });

  it("maps each refusal to its status and Vietnamese message", async () => {
    for (const [reason, status] of [["not-friend", 404], ["not-host", 403], ["seat-taken", 409]] as const) {
      sendChallenge.mockResolvedValueOnce({ ok: false, reason });
      const response = await post(challenges, { code: "K7P2QX", friendId: "lan" });
      expect(response.status).toBe(status);
      expect(((await response.json()) as { error: { message: string } }).error.message).toMatch(/[ạ-ỹ]/);
    }
  });

  it("is throttled, and answers 503 when the link can't be reached", async () => {
    sendChallenge.mockRejectedValueOnce(new Error("down"));
    expect((await post(challenges, { code: "K7P2QX", friendId: "lan" })).status).toBe(503);
    throttled = true;
    expect((await post(challenges, { code: "K7P2QX", friendId: "lan" })).status).toBe(429);
  });

  it("cancels in the caller's name", async () => {
    const response = await post(cancel, { code: "K7P2QX", friendId: "lan" });
    expect(response.status).toBe(204);
    expect(cancelChallenge.mock.calls[0][1]).toEqual({ code: "K7P2QX", friendId: "lan", hostId: "minh" });
  });

  it("hands a signed-in tab a link ticket", async () => {
    const response = await post(link, {});
    expect(response.status).toBe(200);
    expect(((await response.json()) as { ticket: string }).ticket).toMatch(/^[\w-]+\.[\w-]+$/);
  });
});

