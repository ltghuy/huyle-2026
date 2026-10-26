import { beforeEach, describe, expect, it, vi } from "vitest";

const env: Record<string, unknown> = {};
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env }) }));

describe("getEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const key of Object.keys(env)) delete env[key];
  });

  it("parses the bindings and applies defaults", async () => {
    env.STATS_SALT = "x".repeat(32);
    const { getEnv } = await import("./env");
    expect(getEnv()).toEqual({ STATS_SALT: "x".repeat(32), SYNC_MAX_BYTES: 1_048_576 });
  });

  it("rejects a missing or short salt", async () => {
    env.STATS_SALT = "short";
    const { getEnv } = await import("./env");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => getEnv()).toThrow("Invalid environment variables");
  });
});
