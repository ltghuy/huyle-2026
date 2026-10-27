import { afterEach, describe, expect, it, vi } from "vitest";

const recordStats = vi.fn();
const getEnv = vi.fn(() => ({ STATS_SALT: "s".repeat(32) }));
vi.mock("@/server/stats/stats.service", () => ({ recordStats }));
vi.mock("@/server/db", () => ({ getDb: () => ({}) }));
vi.mock("@/server/env", () => ({ getEnv }));

const { POST } = await import("./route");

const today = new Date().toISOString().slice(0, 10);
const valid = {
  day: today,
  deviceId: "0f8fad5b-d9cb-469f-a165-70867728950e",
  lessonsCompleted: 1,
  placementDone: false,
  exercises: { mcq: 3 },
  wrongWords: {},
};

const post = (body: string) => POST(new Request("http://x/api/stats", { method: "POST", body }));

afterEach(() => {
  recordStats.mockReset();
  vi.restoreAllMocks();
});

describe("POST /api/stats", () => {
  it("records a valid report and answers 204", async () => {
    const response = await post(JSON.stringify(valid));
    expect(response.status).toBe(204);
    expect(recordStats).toHaveBeenCalledWith({}, valid, "s".repeat(32));
  });

  it.each([
    ["invalid JSON", "{"],
    ["a failed validation", JSON.stringify({ ...valid, lessonsCompleted: -1 })],
    ["a day too far away", JSON.stringify({ ...valid, day: "2020-01-01" })],
    ["an oversized body", JSON.stringify({ ...valid, pad: "x".repeat(9000) })],
  ])("answers %s with 204 and writes nothing", async (_, body) => {
    const response = await post(body);
    expect(response.status).toBe(204);
    expect(recordStats).not.toHaveBeenCalled();
  });

  it("still answers 204 when the write fails, without logging the report", async () => {
    recordStats.mockRejectedValue(new Error("D1 down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await post(JSON.stringify(valid));
    expect(response.status).toBe(204);
    expect(JSON.stringify(log.mock.calls)).not.toContain(valid.deviceId);
  });
});
