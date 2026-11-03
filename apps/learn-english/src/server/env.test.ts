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

  it("reads the sync-code cut-off when set and rejects a bad date", async () => {
    env.STATS_SALT = "x".repeat(32);
    env.SYNC_CODES_UNTIL = "2026-11-17";
    const { getEnv } = await import("./env");
    expect(getEnv().SYNC_CODES_UNTIL).toBe("2026-11-17");

    vi.resetModules();
    env.SYNC_CODES_UNTIL = "17/11/2026";
    const fresh = await import("./env");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => fresh.getEnv()).toThrow("Invalid environment variables");
  });
});

describe("getAuthEnv", () => {
  const AUTH = {
    BETTER_AUTH_SECRET: "s".repeat(32),
    BETTER_AUTH_URL: "http://localhost:3002",
    GOOGLE_CLIENT_ID: "id.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "secret",
  };

  beforeEach(() => {
    vi.resetModules();
    for (const key of Object.keys(env)) delete env[key];
  });

  it("parses the sign-in secrets", async () => {
    Object.assign(env, AUTH);
    const { getAuthEnv } = await import("./env");
    expect(getAuthEnv()).toEqual(AUTH);
  });

  it("rejects a short secret or a base URL that isn't a URL", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    Object.assign(env, AUTH, { BETTER_AUTH_SECRET: "short" });
    const shortSecret = await import("./env");
    expect(() => shortSecret.getAuthEnv()).toThrow("Invalid environment variables");

    vi.resetModules();
    Object.assign(env, AUTH, { BETTER_AUTH_URL: "localhost" });
    const badUrl = await import("./env");
    expect(() => badUrl.getAuthEnv()).toThrow("Invalid environment variables");
  });

  it("doesn't make the other routes depend on the sign-in secrets", async () => {
    env.STATS_SALT = "x".repeat(32);
    const { getEnv } = await import("./env");
    expect(() => getEnv()).not.toThrow();
  });
});
