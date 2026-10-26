import { beforeEach, describe, expect, it, vi } from "vitest";

const getCloudflareContext = vi.fn(() => ({ env: { DB: {} } }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

describe("getDb", () => {
  beforeEach(() => {
    vi.resetModules();
    getCloudflareContext.mockClear();
  });

  it("does not touch the Cloudflare bindings when the module loads", async () => {
    await import("./index");
    expect(getCloudflareContext).not.toHaveBeenCalled();
  });

  it("reads the D1 binding when called inside a request", async () => {
    const { getDb } = await import("./index");
    expect(getDb()).toBeDefined();
    expect(getCloudflareContext).toHaveBeenCalledTimes(1);
  });
});
