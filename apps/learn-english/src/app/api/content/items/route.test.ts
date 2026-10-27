import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/lib/http";
import type { ContentItemsResponse } from "@/server/content/content.schema";
import type { ContentItemsPayload } from "@/server/content/content.service";

const getContentItems = vi.fn<(...args: unknown[]) => Promise<ContentItemsPayload>>();
vi.mock("@/server/content/content.service", () => ({ getContentItems }));
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));

const { GET } = await import("./route");

const request = (query: string) => new Request(`https://english.huyle.work/api/content/items?${query}`);
const content: ContentItemsResponse = { version: 3, items: [], tombstones: ["word:old"] };
const payload: ContentItemsPayload = { version: 3, json: JSON.stringify(content) };

describe("GET /api/content/items", () => {
  beforeEach(() => {
    getContentItems.mockReset().mockResolvedValue(payload);
  });

  it.each([
    ["an unknown kind", "kind=idiom&level=A1&v=3"],
    ["an unknown level", "kind=word&level=C2&v=3"],
    ["a missing level for words", "kind=word&v=3"],
    ["a missing v", "kind=word&level=A1"],
    ["an empty v", "kind=word&level=A1&v="],
    ["a non-numeric v", "kind=word&level=A1&v=abc"],
    ["a negative v", "kind=word&level=A1&v=-1"],
  ])("rejects %s with 422 and a Vietnamese message", async (_, query) => {
    const response = await GET(request(query));
    expect(response.status).toBe(422);
    const body = (await response.json()) as ApiError;
    expect(body.error.message).toBe("Tham số không hợp lệ.");
    expect(body.error.issues).toBeDefined();
    expect(getContentItems).not.toHaveBeenCalled();
  });

  it("serves the current version with a one-day immutable cache", async () => {
    const response = await GET(request("kind=word&level=A1&v=3"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400, immutable");
    expect(response.headers.get("x-content-cache")).toBe("MISS");
    expect(await response.json()).toEqual(content);
    expect(getContentItems).toHaveBeenCalledWith({}, { kind: "word", level: "A1", v: 3 });
  });

  it("allows grammar and placement without a level", async () => {
    expect((await GET(request("kind=grammar&v=3"))).status).toBe(200);
    expect((await GET(request("kind=placement&v=3"))).status).toBe(200);
  });

  it("answers a stale v with 409 and the current version, uncached", async () => {
    const response = await GET(request("kind=word&level=A1&v=2"));
    expect(response.status).toBe(409);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: { message: "Nội dung vừa được cập nhật. Vui lòng tải lại." },
      version: 3,
    });
  });

  it("answers a database failure with 503", async () => {
    getContentItems.mockRejectedValue(new Error("D1 down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(request("kind=word&level=A1&v=3"));
    expect(response.status).toBe(503);
    expect(((await response.json()) as ApiError).error.message).toMatch(/Không tải được nội dung/);
  });
});

describe("GET /api/content/items with the Workers Cache API", () => {
  const store = new Map<string, Response>();
  const fakeCache = {
    match: async (key: string) => store.get(key)?.clone(),
    put: async (key: string, response: Response) => void store.set(key, response),
  };

  beforeEach(() => {
    store.clear();
    getContentItems.mockReset().mockResolvedValue(payload);
    vi.stubGlobal("caches", { default: fakeCache });
    return () => vi.unstubAllGlobals();
  });

  it("serves a repeated request from the cache, keyed by kind, level and v", async () => {
    const first = await GET(request("kind=word&level=A1&v=3"));
    expect(first.headers.get("x-content-cache")).toBe("MISS");
    await vi.waitFor(() => expect(store.size).toBe(1));
    expect([...store.keys()]).toEqual(["https://english.huyle.work/api/content/items?kind=word&level=A1&v=3"]);

    // Same params in another order, plus noise: still the same cache entry.
    const second = await GET(request("v=3&utm=x&level=A1&kind=word"));
    expect(second.headers.get("x-content-cache")).toBe("HIT");
    expect(await second.json()).toEqual(content);
    expect(getContentItems).toHaveBeenCalledTimes(1);
  });

  it("never caches a 409", async () => {
    await GET(request("kind=word&level=A1&v=2"));
    expect(store.size).toBe(0);
  });
});
