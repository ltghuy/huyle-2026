import { beforeEach, describe, expect, it, vi } from "vitest";
import { BOARD_NAME_ERRORS } from "@/learning/leaderboard";
import type { ApiError } from "@/lib/http";
import { LEADERBOARD_MESSAGES } from "@/server/leaderboard/leaderboard.schema";

const service = { submitEntry: vi.fn(), removeEntry: vi.fn() };
const limit = vi.fn<(options: { key: string }) => Promise<{ success: boolean }>>();
const env: { LEADERBOARD_LIMITER?: { limit: typeof limit } } = {};

vi.mock("@/server/leaderboard/leaderboard.service", () => service);
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env }) }));

const { POST, DELETE } = await import("./route");

const ID = "00000000-0000-4000-8000-000000000001";
const TOKEN = "a".repeat(43);
const BODY = { id: ID, token: TOKEN, name: "Minh Anh", week: "2026-W44", points: 40, previousPoints: 30 };

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
  service.submitEntry.mockReset().mockResolvedValue({ ok: true, rank: 1, previousRank: 2, total: 2, rows: [] });
  service.removeEntry.mockReset().mockResolvedValue({ ok: true });
  limit.mockReset().mockResolvedValue({ success: true });
  env.LEADERBOARD_LIMITER = { limit };
});

describe("POST /api/leaderboard", () => {
  it("stores the hash of the secret, never the secret, and answers the ranks uncached", async () => {
    const response = await POST(request("POST", BODY));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ rank: 1, previousRank: 2, total: 2, rows: [] });
    const [, input] = service.submitEntry.mock.calls[0];
    expect(input).toMatchObject({ id: ID, name: "Minh Anh", week: "2026-W44", points: 40, previousPoints: 30 });
    expect(input.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(input)).not.toContain(TOKEN);
  });

  it.each([
    ["broken JSON", "{", 400],
    ["points over a week's maximum (AC-015)", { ...BODY, points: 301 }, 422],
    ["more points before than after", { ...BODY, previousPoints: 50 }, 422],
    ["a malformed week", { ...BODY, week: "2026-44" }, 422],
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
  it("deletes and answers 204", async () => {
    const response = await DELETE(request("DELETE", { id: ID, token: TOKEN }));
    expect(response.status).toBe(204);
    expect(service.removeEntry).toHaveBeenCalledWith({}, ID, expect.stringMatching(/^[0-9a-f]{64}$/));
  });

  it("answers 403 under another secret", async () => {
    service.removeEntry.mockResolvedValue({ ok: false, reason: "forbidden" });
    expect((await DELETE(request("DELETE", { id: ID, token: TOKEN }))).status).toBe(403);
  });
});
