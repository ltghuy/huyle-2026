import { beforeEach, describe, expect, it, vi } from "vitest";

let signedIn = true;
let throttled = false;
vi.mock("@/server/auth/session", () => ({
  requireUser: async () =>
    signedIn
      ? { user: { id: "minh", name: "Minh Anh", email: "minh@example.com", image: null } }
      : { response: Response.json({ error: { message: "Bạn cần đăng nhập để tiếp tục." } }, { status: 401 }) },
}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env: { ARENA_ROOM: {} } }) }));
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));
vi.mock("@/server/env", () => ({ getArenaEnv: () => ({ ARENA_SECRET: "s".repeat(32) }) }));
vi.mock("@/server/arena/request", async (original) => ({
  ...(await original<typeof import("@/server/arena/request")>()),
  isThrottled: async () => throttled,
}));
const createRoom = vi.fn();
const joinRoom = vi.fn();
vi.mock("@/server/arena/arena.service", async (original) => ({
  ...(await original<typeof import("@/server/arena/arena.service")>()),
  createRoom: (...args: unknown[]) => createRoom(...args),
  joinRoom: (...args: unknown[]) => joinRoom(...args),
}));
const getStats = vi.fn();
vi.mock("@/server/arena/stats", () => ({ getStats: (...args: unknown[]) => getStats(...args) }));

const rooms = await import("./rooms/route");
const join = await import("./join/route");
const stats = await import("./stats/route");

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
      ["started", 409, "Trận đấu trong phòng này đã bắt đầu."],
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
