import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/lib/http";
import { CLAIMS_MESSAGES } from "@/server/claims/claims.schema";

const service = { submitClaims: vi.fn(), claimStatuses: vi.fn() };
const limit = vi.fn<(options: { key: string }) => Promise<{ success: boolean }>>();
const env: { CLAIMS_LIMITER?: { limit: typeof limit } } = {};
const db = {};
const SALT = "s".repeat(32);

vi.mock("@/server/claims/claims.service", () => service);
vi.mock("@/server/db", () => ({ getDb: () => db }));
vi.mock("@/server/env", () => ({ getEnv: () => ({ STATS_SALT: SALT }) }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env }) }));

let signedIn = true;
vi.mock("@/server/auth/session", () => ({
  requireUser: async () =>
    signedIn
      ? { user: { id: "u1", name: "Minh Anh", email: "minh@example.com", image: null } }
      : { response: Response.json({ error: { message: "Bạn cần đăng nhập để tiếp tục." } }, { status: 401 }) },
}));
const { POST } = await import("./route");
const { POST: STATUS } = await import("./status/route");

const DEVICE = "0f8fad5b-d9cb-469f-a165-70867728950e";
const ID = "00000000-0000-4000-8000-000000000001";
const BODY = { deviceId: DEVICE, claims: [{ id: ID, sentenceId: "sentence:greet-1", answer: "  Hello there  " }] };

function request(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://english.huyle.work${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function message(response: Response) {
  return ((await response.json()) as ApiError).error.message;
}

beforeEach(() => {
  service.submitClaims.mockReset().mockResolvedValue([ID]);
  service.claimStatuses.mockReset().mockResolvedValue([{ id: ID, status: "rejected", explanationVi: "Thiếu mạo từ." }]);
  limit.mockReset().mockResolvedValue({ success: true });
  env.CLAIMS_LIMITER = { limit };
  signedIn = true;
});

describe("claims for guests (022 AC-013)", () => {
  it("refuses sending and checking claims without a session", async () => {
    signedIn = false;
    expect((await POST(request("/api/claims", BODY))).status).toBe(401);
    expect((await STATUS(request("/api/claims/status", { ids: [ID] }))).status).toBe(401);
    expect(service.submitClaims).not.toHaveBeenCalled();
    expect(service.claimStatuses).not.toHaveBeenCalled();
  });
});

describe("POST /api/claims", () => {
  it("stores the trimmed claims and answers the accepted ids uncached", async () => {
    const response = await POST(request("/api/claims", BODY));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ accepted: [ID] });
    expect(service.submitClaims).toHaveBeenCalledWith(
      db,
      { deviceId: DEVICE, claims: [{ ...BODY.claims[0], answer: "Hello there" }] },
      SALT,
      expect.any(Number),
    );
    expect(limit).toHaveBeenCalledWith({ key: "203.0.113.7" });
  });

  it.each([
    ["invalid JSON", "{"],
    ["no claims", { deviceId: DEVICE, claims: [] }],
    ["a bad device id", { ...BODY, deviceId: "nope" }],
    ["a bad sentence id", { deviceId: DEVICE, claims: [{ ...BODY.claims[0], sentenceId: "word:cat" }] }],
    ["a blank answer", { deviceId: DEVICE, claims: [{ ...BODY.claims[0], answer: "   " }] }],
    ["an answer over 500 characters", { deviceId: DEVICE, claims: [{ ...BODY.claims[0], answer: "a".repeat(501) }] }],
    ["a repeated claim id", { deviceId: DEVICE, claims: [BODY.claims[0], BODY.claims[0]] }],
    ["more than 10 claims", { deviceId: DEVICE, claims: Array.from({ length: 11 }, (_, i) => ({ ...BODY.claims[0], id: `00000000-0000-4000-8000-0000000000${10 + i}` })) }],
  ])("answers %s with 400 and stores nothing", async (_, body) => {
    const response = await POST(request("/api/claims", body));
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect([CLAIMS_MESSAGES.invalidJson, CLAIMS_MESSAGES.invalidBody]).toContain(await message(response));
    expect(service.submitClaims).not.toHaveBeenCalled();
  });

  it("refuses an oversized body with 413", async () => {
    const response = await POST(request("/api/claims", { ...BODY, pad: "x".repeat(9000) }));
    expect(response.status).toBe(413);
    expect(await message(response)).toBe(CLAIMS_MESSAGES.tooLarge);
    expect(service.submitClaims).not.toHaveBeenCalled();
  });

  it("answers 429 when the limiter refuses the IP", async () => {
    limit.mockResolvedValue({ success: false });
    const response = await POST(request("/api/claims", BODY));
    expect(response.status).toBe(429);
    expect(await message(response)).toBe(CLAIMS_MESSAGES.throttled);
    expect(service.submitClaims).not.toHaveBeenCalled();
  });

  it("is not throttled without the limiter binding", async () => {
    delete env.CLAIMS_LIMITER;
    expect((await POST(request("/api/claims", BODY))).status).toBe(200);
  });

  it("answers 503 when the write fails, without logging the answer", async () => {
    service.submitClaims.mockRejectedValue(new Error("D1 down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(request("/api/claims", BODY));
    expect(response.status).toBe(503);
    expect(await message(response)).toBe(CLAIMS_MESSAGES.unavailable);
    expect(JSON.stringify(log.mock.calls)).not.toContain("Hello there");
    log.mockRestore();
  });
});

describe("POST /api/claims/status", () => {
  it("answers the known claims uncached", async () => {
    const response = await STATUS(request("/api/claims/status", { ids: [ID] }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ claims: [{ id: ID, status: "rejected", explanationVi: "Thiếu mạo từ." }] });
    expect(service.claimStatuses).toHaveBeenCalledWith(db, [ID]);
  });

  it.each([
    ["no ids", { ids: [] }],
    ["a bad id", { ids: ["nope"] }],
    ["more than 50 ids", { ids: Array.from({ length: 51 }, () => ID) }],
  ])("answers %s with 400", async (_, body) => {
    const response = await STATUS(request("/api/claims/status", body));
    expect(response.status).toBe(400);
    expect(service.claimStatuses).not.toHaveBeenCalled();
  });

  it("answers 413 for an oversized body and 429 when throttled", async () => {
    expect((await STATUS(request("/api/claims/status", { ids: [ID], pad: "x".repeat(9000) }))).status).toBe(413);
    limit.mockResolvedValue({ success: false });
    expect((await STATUS(request("/api/claims/status", { ids: [ID] }))).status).toBe(429);
    expect(service.claimStatuses).not.toHaveBeenCalled();
  });
});
