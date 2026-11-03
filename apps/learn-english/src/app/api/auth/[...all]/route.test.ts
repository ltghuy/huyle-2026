import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/lib/http";

const handler = vi.fn(async () => new Response("ok"));
let authBroken = false;
vi.mock("@/server/auth/auth", () => ({
  getAuth: () => {
    if (authBroken) throw new Error("Invalid environment variables");
    return { handler };
  },
}));
const limit = vi.fn(async () => ({ success: true }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env: { AUTH_LIMITER: { limit } } }) }));

const { GET, POST } = await import("./route");
const at = (path: string, init?: RequestInit) =>
  new Request(`http://localhost:3002${path}`, { ...init, headers: { "cf-connecting-ip": "1.2.3.4", ...init?.headers } });

describe("/api/auth/[...all]", () => {
  beforeEach(() => {
    handler.mockClear();
    limit.mockReset().mockResolvedValue({ success: true });
    authBroken = false;
  });

  it("hands sign-in, callback and session requests to Better Auth", async () => {
    expect(await (await POST(at("/api/auth/sign-in/social", { method: "POST" }))).text()).toBe("ok");
    expect(await (await GET(at("/api/auth/callback/google?code=x"))).text()).toBe("ok");
    expect(await (await GET(at("/api/auth/get-session"))).text()).toBe("ok");
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it("throttles starting a sign-in and the callback per IP, but not reading the session", async () => {
    limit.mockResolvedValue({ success: false });
    const throttled = await POST(at("/api/auth/sign-in/social", { method: "POST" }));
    expect(throttled.status).toBe(429);
    expect(((await throttled.json()) as ApiError).error.message).toMatch(/Đợi một phút/);
    expect((await GET(at("/api/auth/callback/google?code=x"))).status).toBe(429);
    expect((await GET(at("/api/auth/get-session"))).status).toBe(200);
    expect(limit).toHaveBeenCalledWith({ key: "1.2.3.4" });
  });

  it("answers 503 in Vietnamese when sign-in isn't configured", async () => {
    authBroken = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(at("/api/auth/get-session"));
    expect(response.status).toBe(503);
    expect(((await response.json()) as ApiError).error.message).toMatch(/Đăng nhập đang tạm thời gián đoạn/);
  });
});
