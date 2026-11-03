import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/lib/http";

let signedIn = true;
vi.mock("@/server/auth/session", () => ({
  requireUser: async () =>
    signedIn
      ? { user: { id: "u1", name: "Minh Anh", email: "minh@example.com", image: null } }
      : { response: Response.json({ error: { message: "Bạn cần đăng nhập để tiếp tục." } }, { status: 401 }) },
}));
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));
vi.mock("@/server/env", () => ({ getEnv: () => ({ STATS_SALT: "s".repeat(32), SYNC_MAX_BYTES: 64 }) }));
const getProgress = vi.fn();
const putProgress = vi.fn();
vi.mock("@/server/progress/progress.service", () => ({ getProgress: (...args: unknown[]) => getProgress(...args), putProgress: (...args: unknown[]) => putProgress(...args) }));

const { GET, PUT } = await import("./route");
const URL_ = "https://english.huyle.work/api/progress";
const put = (body: unknown) => PUT(new Request(URL_, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const BODY = { rev: 0, data: btoa("progress"), deviceId: "device-aaaa", countMe: true };

describe("/api/progress", () => {
  beforeEach(() => {
    signedIn = true;
    getProgress.mockReset();
    putProgress.mockReset();
  });

  it("refuses guests on both methods (AC-013)", async () => {
    signedIn = false;
    expect((await GET(new Request(URL_))).status).toBe(401);
    expect((await put(BODY)).status).toBe(401);
    expect(putProgress).not.toHaveBeenCalled();
  });

  it("reads the signed-in learner's progress, never cached", async () => {
    getProgress.mockResolvedValue({ ok: true, rev: 3, data: "AAAA", updatedAt: 5 });
    const response = await GET(new Request(URL_));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ rev: 3, data: "AAAA", updatedAt: 5 });
    expect(getProgress).toHaveBeenCalledWith({}, "u1");
  });

  it("answers 404 when the account has no progress yet", async () => {
    getProgress.mockResolvedValue({ ok: false, reason: "not-found" });
    const response = await GET(new Request(URL_));
    expect(response.status).toBe(404);
    expect(((await response.json()) as ApiError).error.message).toBe("Tài khoản chưa có tiến độ nào.");
  });

  it("writes for the session's account, not one named in the body", async () => {
    putProgress.mockResolvedValue({ ok: true, rev: 1 });
    const response = await put({ ...BODY, userId: "someone-else" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rev: 1 });
    expect(putProgress).toHaveBeenCalledWith({}, "u1", BODY, expect.objectContaining({ maxBytes: 64 }));
  });

  it("answers 409 with the stored rev on a conflict", async () => {
    putProgress.mockResolvedValue({ ok: false, reason: "conflict", rev: 4 });
    const response = await put(BODY);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { message: "Tiến độ vừa được cập nhật từ thiết bị khác." }, rev: 4 });
  });

  it("refuses an oversized upload before reading it, and a malformed body with 422", async () => {
    // Request drops a hand-set content-length, so this is a stand-in (as in the sync route test).
    const json = vi.fn();
    const oversized = { headers: new Headers({ "content-length": "100000" }), json } as unknown as Request;
    expect((await PUT(oversized)).status).toBe(413);
    expect(json).not.toHaveBeenCalled();
    expect((await put({ ...BODY, rev: -1 })).status).toBe(422);
    expect((await put({ ...BODY, deviceId: "x" })).status).toBe(422);
    expect(putProgress).not.toHaveBeenCalled();
  });
});
