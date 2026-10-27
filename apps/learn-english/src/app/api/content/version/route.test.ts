import { describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/lib/http";

const getContentVersion = vi.fn();
vi.mock("@/server/content/content.service", () => ({ getContentVersion }));
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));

const { GET } = await import("./route");

describe("GET /api/content/version", () => {
  it("returns the version with short edge caching", async () => {
    getContentVersion.mockResolvedValue({ version: 4, publishedAt: 123 });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=60, s-maxage=300");
    expect(await response.json()).toEqual({ version: 4, publishedAt: 123 });
  });

  it("answers a database failure with 503 and a Vietnamese message", async () => {
    getContentVersion.mockRejectedValue(new Error("D1 down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET();
    expect(response.status).toBe(503);
    expect(((await response.json()) as ApiError).error.message).toMatch(/Không tải được phiên bản nội dung/);
  });
});
