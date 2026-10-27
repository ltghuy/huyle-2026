import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/lib/http";
import { hashSyncCode } from "@/server/sync/code";
import { SYNC_MESSAGES } from "@/server/sync/sync.schema";

const service = {
  createSyncProfile: vi.fn(),
  getSyncProfile: vi.fn(),
  putSyncProfile: vi.fn(),
  deleteSyncProfile: vi.fn(),
};
const limit = vi.fn<(options: { key: string }) => Promise<{ success: boolean }>>();
const env: { SYNC_LOOKUP_LIMITER?: { limit: typeof limit } } = {};

vi.mock("@/server/sync/sync.service", () => service);
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));
vi.mock("@/server/env", () => ({ getEnv: () => ({ SYNC_MAX_BYTES: 1_048_576, STATS_SALT: "x".repeat(32) }) }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env }) }));

const { POST, GET, PUT, DELETE } = await import("./route");

const URL = "https://english.huyle.work/api/sync";
const CODE = "ABCD-1234-EFGH";
const DATA = btoa("gzip");

function request(method: string, { code, body, headers = {} }: { code?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return new Request(URL, {
    method,
    headers: {
      ...(code ? { "x-sync-code": code } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function message(response: Response) {
  return ((await response.json()) as ApiError).error.message;
}

beforeEach(() => {
  for (const fn of Object.values(service)) fn.mockReset();
  limit.mockReset().mockResolvedValue({ success: true });
  env.SYNC_LOOKUP_LIMITER = { limit };
});

describe("POST /api/sync", () => {
  it("creates a profile and answers 201 with the code and rev 1, uncached", async () => {
    service.createSyncProfile.mockResolvedValue({ ok: true, code: CODE });
    const response = await POST(request("POST", { body: { data: DATA } }));
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ code: CODE, rev: 1 });
    expect(service.createSyncProfile).toHaveBeenCalledWith({}, DATA, expect.objectContaining({ maxBytes: 1_048_576 }));
  });

  it.each([
    ["broken JSON", "{", 400, SYNC_MESSAGES.invalidJson],
    ["a missing data field", {}, 422, SYNC_MESSAGES.invalidBody],
    ["data that isn't base64", { data: "not base64!" }, 422, SYNC_MESSAGES.invalidBody],
  ])("rejects %s with a Vietnamese message", async (_, body, status, text) => {
    const response = await POST(request("POST", { body }));
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await message(response)).toBe(text);
    expect(service.createSyncProfile).not.toHaveBeenCalled();
  });

  it("answers 413 when the service finds the payload too large", async () => {
    service.createSyncProfile.mockResolvedValue({ ok: false, reason: "too-large" });
    const response = await POST(request("POST", { body: { data: DATA } }));
    expect(response.status).toBe(413);
    expect(await message(response)).toBe(SYNC_MESSAGES.tooLarge);
  });

  it("answers 413 from the declared length before reading the body", async () => {
    // Request drops a hand-set content-length, so this is a stand-in.
    const json = vi.fn();
    const oversized = { headers: new Headers({ "content-length": "5000000" }), json } as unknown as Request;
    const response = await POST(oversized);
    expect(response.status).toBe(413);
    expect(json).not.toHaveBeenCalled();
    expect(service.createSyncProfile).not.toHaveBeenCalled();
  });

  it("answers 503 when D1 fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    service.createSyncProfile.mockRejectedValue(new Error("D1 down"));
    const response = await POST(request("POST", { body: { data: DATA } }));
    expect(response.status).toBe(503);
    expect(await message(response)).toBe(SYNC_MESSAGES.unavailable);
  });
});

describe("the x-sync-code header", () => {
  it.each([
    ["GET", GET],
    ["PUT", PUT],
    ["DELETE", DELETE],
  ] as const)("is required by %s (400)", async (method, handler) => {
    const response = await handler(request(method, { body: method === "PUT" ? { rev: 1, data: DATA } : undefined }));
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await message(response)).toBe(SYNC_MESSAGES.missingCode);
  });

  it("rejects a malformed code with 400 and doesn't count it as a failed lookup", async () => {
    const response = await GET(request("GET", { code: "ABCD-1234-EFGU" }));
    expect(response.status).toBe(400);
    expect(await message(response)).toBe(SYNC_MESSAGES.invalidCode);
    expect(service.getSyncProfile).not.toHaveBeenCalled();
    expect(limit).not.toHaveBeenCalled();
  });

  it("is normalised and hashed before the lookup", async () => {
    service.getSyncProfile.mockResolvedValue({ ok: true, rev: 2, data: DATA, updatedAt: 5 });
    await GET(request("GET", { code: " abcd 1234 efgh " }));
    expect(service.getSyncProfile).toHaveBeenCalledWith({}, await hashSyncCode("ABCD1234EFGH"));
  });
});

describe("GET /api/sync", () => {
  it("returns rev, data and updatedAt, uncached", async () => {
    service.getSyncProfile.mockResolvedValue({ ok: true, rev: 2, data: DATA, updatedAt: 5 });
    const response = await GET(request("GET", { code: CODE }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ rev: 2, data: DATA, updatedAt: 5 });
    expect(limit).not.toHaveBeenCalled();
  });

  it("answers an unknown code with 404 and counts the failure by IP", async () => {
    service.getSyncProfile.mockResolvedValue({ ok: false, reason: "not-found" });
    const response = await GET(request("GET", { code: CODE, headers: { "cf-connecting-ip": "203.0.113.9" } }));
    expect(response.status).toBe(404);
    expect(await message(response)).toBe(SYNC_MESSAGES.notFound);
    expect(limit).toHaveBeenCalledWith({ key: "203.0.113.9" });
  });

  it("answers 429 once the limiter says no", async () => {
    service.getSyncProfile.mockResolvedValue({ ok: false, reason: "not-found" });
    limit.mockResolvedValue({ success: false });
    const response = await GET(request("GET", { code: CODE }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await message(response)).toBe(SYNC_MESSAGES.throttled);
    expect(limit).toHaveBeenCalledWith({ key: "unknown" });
  });

  it("still answers 404 when the limiter binding is missing", async () => {
    delete env.SYNC_LOOKUP_LIMITER;
    service.getSyncProfile.mockResolvedValue({ ok: false, reason: "not-found" });
    expect((await GET(request("GET", { code: CODE }))).status).toBe(404);
  });

  it("still answers 404 when the limiter throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    limit.mockRejectedValue(new Error("no limiter here"));
    service.getSyncProfile.mockResolvedValue({ ok: false, reason: "not-found" });
    expect((await GET(request("GET", { code: CODE }))).status).toBe(404);
  });
});

describe("PUT /api/sync", () => {
  it("returns the new rev", async () => {
    service.putSyncProfile.mockResolvedValue({ ok: true, rev: 4 });
    const response = await PUT(request("PUT", { code: CODE, body: { rev: 3, data: DATA } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ rev: 4 });
    expect(service.putSyncProfile).toHaveBeenCalledWith({}, expect.any(String), { rev: 3, data: DATA }, expect.any(Object));
  });

  it("answers a stale rev with 409 and the stored rev", async () => {
    service.putSyncProfile.mockResolvedValue({ ok: false, reason: "conflict", rev: 8 });
    const response = await PUT(request("PUT", { code: CODE, body: { rev: 7, data: DATA } }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { message: SYNC_MESSAGES.conflict }, rev: 8 });
  });

  it("answers 413 for an oversized payload", async () => {
    service.putSyncProfile.mockResolvedValue({ ok: false, reason: "too-large" });
    const response = await PUT(request("PUT", { code: CODE, body: { rev: 1, data: DATA } }));
    expect(response.status).toBe(413);
  });

  it.each([{ rev: 0, data: DATA }, { rev: 1.5, data: DATA }, { data: DATA }])("rejects a bad rev %j with 422", async (body) => {
    const response = await PUT(request("PUT", { code: CODE, body }));
    expect(response.status).toBe(422);
    expect(await message(response)).toBe(SYNC_MESSAGES.invalidBody);
  });

  it("throttles writes to unknown codes", async () => {
    service.putSyncProfile.mockResolvedValue({ ok: false, reason: "not-found" });
    expect((await PUT(request("PUT", { code: CODE, body: { rev: 1, data: DATA } }))).status).toBe(404);
    limit.mockResolvedValue({ success: false });
    expect((await PUT(request("PUT", { code: CODE, body: { rev: 1, data: DATA } }))).status).toBe(429);
  });
});

describe("DELETE /api/sync", () => {
  it("answers 204 with no body", async () => {
    service.deleteSyncProfile.mockResolvedValue(true);
    const response = await DELETE(request("DELETE", { code: CODE }));
    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });

  it("answers an unknown code with 404, or 429 when throttled", async () => {
    service.deleteSyncProfile.mockResolvedValue(false);
    expect((await DELETE(request("DELETE", { code: CODE }))).status).toBe(404);
    limit.mockResolvedValue({ success: false });
    expect((await DELETE(request("DELETE", { code: CODE }))).status).toBe(429);
  });
});
