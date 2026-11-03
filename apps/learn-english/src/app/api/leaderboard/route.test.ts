import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOARD_NAME_ERRORS } from "@/learning/leaderboard";
import type { ApiError } from "@/lib/http";
import { LEADERBOARD_MESSAGES } from "@/server/leaderboard/leaderboard.schema";

const service = { submitEntry: vi.fn(), removeEntry: vi.fn(), topEntries: vi.fn(), dropOtherEntries: vi.fn(), removeAccountEntries: vi.fn() };
const limit = vi.fn<(options: { key: string }) => Promise<{ success: boolean }>>();
const env: { LEADERBOARD_LIMITER?: { limit: typeof limit } } = {};

vi.mock("@/server/leaderboard/leaderboard.service", () => service);
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env }) }));

let signedIn = true;
vi.mock("@/server/auth/session", () => ({
  requireUser: async () =>
    signedIn
      ? { user: { id: "u1", name: "Minh Anh", email: "minh@example.com", image: null } }
      : { response: Response.json({ error: { message: "Bạn cần đăng nhập để tiếp tục." } }, { status: 401 }) },
}));
const { GET, POST, DELETE } = await import("./route");

const ID = "00000000-0000-4000-8000-000000000001";
const TOKEN = "a".repeat(43);
const NOW = Date.parse("2026-11-20T10:00:00Z");
const BODY = { id: ID, token: TOKEN, name: "Minh Anh", today: "2026-11-20", lastDate: "2026-11-20", streak: 6, earned: 120, previousStreak: 5, previousEarned: 100 };

function request(method: string, body: unknown) {
  return new Request("https://english.huyle.work/api/leaderboard", {
    method,
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function message(response: Response) {
  return ((await response.json()) as ApiError).error.message;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  service.submitEntry.mockReset().mockResolvedValue({ ok: true, rank: 1, previousRank: 2, total: 2, rows: [] });
  service.removeEntry.mockReset().mockResolvedValue({ ok: true });
  limit.mockReset().mockResolvedValue({ success: true });
  env.LEADERBOARD_LIMITER = { limit };
  signedIn = true;
});

describe("/api/leaderboard for guests (022 AC-011, AC-013)", () => {
  it("refuses every method without a session and touches nothing", async () => {
    signedIn = false;
    const get = await GET(new Request("https://english.huyle.work/api/leaderboard?today=2026-11-20"));
    expect(get.status).toBe(401);
    expect((await POST(request("POST", BODY))).status).toBe(401);
    expect((await DELETE(request("DELETE", { id: ID, token: TOKEN }))).status).toBe(401);
    expect(service.submitEntry).not.toHaveBeenCalled();
    expect(service.removeEntry).not.toHaveBeenCalled();
  });

  it("ranks the Google account: one entry, keyed by the account, replacing this browser's older one", async () => {
    await POST(request("POST", BODY));
    expect(service.submitEntry.mock.calls[0][1]).toMatchObject({ id: "u1", userId: "u1" });
    expect(service.dropOtherEntries).toHaveBeenCalledWith({}, "u1", { id: ID, tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });

  it("shows the chosen name, else the Google name", async () => {
    await POST(request("POST", BODY));
    expect(service.submitEntry.mock.calls[0][1]).toMatchObject({ name: "Minh Anh" });
    await POST(request("POST", { ...BODY, name: "  " }));
    expect(service.submitEntry.mock.calls[1][1]).toMatchObject({ name: "Minh Anh" });
    await POST(request("POST", { ...BODY, name: "Evan" }));
    expect(service.submitEntry.mock.calls[2][1]).toMatchObject({ name: "Evan" });
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/leaderboard", () => {
  it("stores the hash of the secret, never the secret, and answers the ranks uncached", async () => {
    const response = await POST(request("POST", BODY));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ rank: 1, previousRank: 2, total: 2, rows: [] });
    const [, input] = service.submitEntry.mock.calls[0];
    expect(input).toMatchObject({ id: "u1", name: "Minh Anh", today: "2026-11-20", lastDate: "2026-11-20", streak: 6, earned: 120, previousStreak: 5, previousEarned: 100 });
    expect(input.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(input)).not.toContain(TOKEN);
  });

  it.each([
    ["broken JSON", "{", 400],
    ["a streak longer than the days since the app opened (013 AC-016)", { ...BODY, streak: 27 }, 422],
    ["more points than those days can award", { ...BODY, earned: 26 * 20 + 151 }, 422],
    ["a longer streak before than after", { ...BODY, previousStreak: 7 }, 422],
    ["a last lesson after today", { ...BODY, lastDate: "2026-11-21" }, 422],
    ["a today far from the server's date", { ...BODY, today: "2026-11-23", lastDate: "2026-11-23" }, 422],
    ["a malformed date", { ...BODY, today: "2026-11-2" }, 422],
    ["a short secret", { ...BODY, token: "short" }, 422],
  ])("refuses %s", async (_label, body, status) => {
    expect((await POST(request("POST", body))).status).toBe(status);
    expect(service.submitEntry).not.toHaveBeenCalled();
  });

  it("refuses a blocked name whatever the browser sent (AC-013)", async () => {
    const response = await POST(request("POST", { ...BODY, name: "Đéo biết" }));
    expect(response.status).toBe(422);
    expect(await message(response)).toBe(BOARD_NAME_ERRORS.blocked);
  });

  it("answers 403 for an entry under another secret (AC-014)", async () => {
    service.submitEntry.mockResolvedValue({ ok: false, reason: "forbidden" });
    const response = await POST(request("POST", BODY));
    expect(response.status).toBe(403);
    expect(await message(response)).toBe(LEADERBOARD_MESSAGES.forbidden);
  });

  it("answers 422 when the numbers can't have been earned since the last report (013 AC-016)", async () => {
    service.submitEntry.mockResolvedValue({ ok: false, reason: "implausible" });
    const response = await POST(request("POST", BODY));
    expect(response.status).toBe(422);
    expect(await message(response)).toBe(LEADERBOARD_MESSAGES.implausible);
  });

  it("slows down a network that writes too often (AC-016)", async () => {
    limit.mockResolvedValue({ success: false });
    const response = await POST(request("POST", BODY));
    expect(response.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: "203.0.113.7" });
  });

  it("answers 503 when the database fails", async () => {
    service.submitEntry.mockRejectedValue(new Error("D1 down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(request("POST", BODY))).status).toBe(503);
  });
});

describe("DELETE /api/leaderboard (AC-010)", () => {
  it("takes the account's entries off the board, and this browser's older one, and answers 204", async () => {
    const response = await DELETE(request("DELETE", { id: ID, token: TOKEN }));
    expect(response.status).toBe(204);
    expect(service.removeAccountEntries).toHaveBeenCalledWith({}, "u1");
    expect(service.removeEntry).toHaveBeenCalledWith({}, ID, expect.stringMatching(/^[0-9a-f]{64}$/));
  });

  it("still answers 204 when the browser's old entry belongs to someone else", async () => {
    service.removeEntry.mockResolvedValue({ ok: false, reason: "forbidden" });
    expect((await DELETE(request("DELETE", { id: ID, token: TOKEN }))).status).toBe(204);
  });
});

describe("GET /api/leaderboard (017)", () => {
  const get = (search: string, headers: Record<string, string> = {}) => GET(new Request(`https://english.huyle.work/api/leaderboard${search}`, { headers }));

  beforeEach(() => {
    service.topEntries.mockReset().mockResolvedValue({ total: 0, rows: [] });
  });

  it("reads the top 10 for the learner's date and their account's place, uncached", async () => {
    const response = await get("?today=2026-11-20", { "x-board-id": ID });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ total: 0, rows: [] });
    expect(service.topEntries).toHaveBeenCalledWith(expect.anything(), "2026-11-20", "u1");
  });

  it("answers 422 for a missing or far-off date, or a malformed id", async () => {
    expect((await get("")).status).toBe(422);
    expect((await get("?today=2026-11-25")).status).toBe(422);
    expect((await get("?today=2026-11-20", { "x-board-id": "nope" })).status).toBe(422);
    expect(service.topEntries).not.toHaveBeenCalled();
  });

  it("answers 503 when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    service.topEntries.mockRejectedValue(new Error("D1 down"));
    const response = await get("?today=2026-11-20");
    expect(response.status).toBe(503);
    expect(await message(response)).toBe(LEADERBOARD_MESSAGES.unavailable);
  });
});
