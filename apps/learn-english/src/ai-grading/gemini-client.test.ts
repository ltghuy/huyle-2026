import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_BUDGET_MS, AI_GENERATE_URL, MINUTE_SKIP_MS } from "@/learning/exercises/translate-ai";
import { addAiKey, getAiKeys, resetAiKeysForTest } from "@/lib/ai-keys";
import { checkAiKey, gradeWithAi, resetGeminiClientForTest } from "./gemini-client";

const PROMPT = { vi: "Ngày mai tôi sẽ đi siêu thị với anh trai.", en: "Tomorrow I will go to the supermarket with my older brother." };
const ANSWER = "I'm going to the supermarket with my older brother tomorrow.";
const NOW = Date.parse("2026-11-09T10:00:00Z");

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const verdict = (correct: boolean, explanationVi = "") =>
  json(200, { candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ correct, explanationVi }) }] } }] });
const dayQuota = () => json(429, { error: { status: "RESOURCE_EXHAUSTED", details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } });
const minuteQuota = () => json(429, { error: { status: "RESOURCE_EXHAUSTED", details: [{ violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }] }] } });
const badKey = () => json(400, { error: { status: "INVALID_ARGUMENT", message: "API key not valid.", details: [{ reason: "API_KEY_INVALID" }] } });

let fetchMock: ReturnType<typeof vi.fn>;

function keyOf(call: unknown[]): string {
  return (call[1] as RequestInit).headers instanceof Headers
    ? ((call[1] as RequestInit).headers as Headers).get("x-goog-api-key")!
    : ((call[1] as RequestInit).headers as Record<string, string>)["x-goog-api-key"]!;
}

beforeEach(() => {
  localStorage.clear();
  resetAiKeysForTest();
  resetGeminiClientForTest();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  addAiKey("key-1");
  addAiKey("key-2");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const statuses = () => getAiKeys().map(({ status, skipUntil }) => ({ status, skipUntil }));

describe("gradeWithAi (033)", () => {
  it("grades with key 1 and sends the key only to Google, in a header", async () => {
    fetchMock.mockResolvedValueOnce(verdict(true));
    await expect(gradeWithAi(PROMPT, ANSWER, undefined, () => NOW)).resolves.toEqual({ correct: true, explanationVi: "" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(AI_GENERATE_URL);
    expect(String(url)).not.toContain("key-1");
    expect(keyOf(fetchMock.mock.calls[0]!)).toBe("key-1");
    expect(JSON.parse((init as RequestInit).body as string).contents[0].parts[0].text).toContain(ANSWER);
  });

  it("moves to key 2 when key 1's daily quota is used up, and pauses key 1 until Pacific midnight (AC-013, AC-015)", async () => {
    fetchMock.mockResolvedValueOnce(dayQuota()).mockResolvedValueOnce(verdict(false, "Sai thì."));
    await expect(gradeWithAi(PROMPT, ANSWER, undefined, () => NOW)).resolves.toEqual({ correct: false, explanationVi: "Sai thì." });
    expect(fetchMock.mock.calls.map(keyOf)).toEqual(["key-1", "key-2"]);
    expect(statuses()[0]).toEqual({ status: "quota", skipUntil: Date.parse("2026-11-10T08:00:00Z") });
    expect(statuses()[1]).toEqual({ status: "working", skipUntil: undefined });
  });

  it("pauses a key over its per-minute limit for a minute but keeps it working (AC-015)", async () => {
    fetchMock.mockResolvedValueOnce(minuteQuota()).mockResolvedValueOnce(verdict(true));
    await gradeWithAi(PROMPT, ANSWER, undefined, () => NOW);
    expect(statuses()[0]).toEqual({ status: "working", skipUntil: NOW + MINUTE_SKIP_MS });
  });

  it("marks a refused key invalid and skips it from then on (AC-014)", async () => {
    fetchMock.mockResolvedValueOnce(badKey()).mockResolvedValue(verdict(true));
    await gradeWithAi(PROMPT, ANSWER, undefined, () => NOW);
    expect(getAiKeys()[0]).toMatchObject({ status: "invalid", reasonVi: expect.any(String) });
    await gradeWithAi(PROMPT, ANSWER, undefined, () => NOW + 86_400_000);
    expect(fetchMock.mock.calls.map(keyOf)).toEqual(["key-1", "key-2", "key-2"]);
  });

  it("returns null when every key is out, without calling Google again (AC-016)", async () => {
    fetchMock.mockResolvedValueOnce(dayQuota()).mockResolvedValueOnce(dayQuota());
    await expect(gradeWithAi(PROMPT, ANSWER, undefined, () => NOW)).resolves.toBeNull();
    await expect(gradeWithAi(PROMPT, ANSWER, undefined, () => NOW + 1000)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives an unreadable reply or a server error one more key at most", async () => {
    addAiKey("key-3");
    fetchMock.mockResolvedValueOnce(json(200, { candidates: [] })).mockResolvedValueOnce(json(503, { error: { status: "UNAVAILABLE" } }));
    await expect(gradeWithAi(PROMPT, ANSWER, undefined, () => NOW)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(statuses().every((key) => key.status === "working")).toBe(true);
  });

  it("switches to the other output format on a request-shape error and keeps it", async () => {
    fetchMock
      .mockResolvedValueOnce(json(400, { error: { status: "INVALID_ARGUMENT", message: 'Unknown name "responseJsonSchema"' } }))
      .mockResolvedValue(verdict(true));
    await expect(gradeWithAi(PROMPT, ANSWER, undefined, () => NOW)).resolves.toEqual({ correct: true, explanationVi: "" });
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse((call[1] as RequestInit).body as string).generationConfig);
    expect(bodies[0]).toHaveProperty("responseJsonSchema");
    expect(bodies[1]).toHaveProperty("responseFormat");
    expect(fetchMock.mock.calls.map(keyOf)).toEqual(["key-1", "key-1"]);
    await gradeWithAi(PROMPT, ANSWER, undefined, () => NOW);
    expect(JSON.parse((fetchMock.mock.calls[2]![1] as RequestInit).body as string).generationConfig).toHaveProperty("responseFormat");
  });

  it("gives up after the time budget (AC-016)", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))),
    );
    const pending = gradeWithAi(PROMPT, ANSWER, undefined, () => NOW);
    await vi.advanceTimersByTimeAsync(AI_BUDGET_MS);
    await expect(pending).resolves.toBeNull();
    expect(statuses().every((key) => key.status === "working" && key.skipUntil === undefined)).toBe(true);
  });

  it("stops when the caller aborts, without touching key statuses", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))),
    );
    const pending = gradeWithAi(PROMPT, ANSWER, controller.signal, () => NOW);
    controller.abort();
    await expect(pending).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null at once with no usable key", async () => {
    resetAiKeysForTest();
    localStorage.clear();
    await expect(gradeWithAi(PROMPT, ANSWER)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("checkAiKey (033)", () => {
  it("accepts a key Google knows, even if it is over quota (AC-002)", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { models: [] })).mockResolvedValueOnce(dayQuota());
    await expect(checkAiKey(" key-9 ")).resolves.toEqual({ ok: true });
    await expect(checkAiKey("key-9")).resolves.toEqual({ ok: true });
    expect(keyOf(fetchMock.mock.calls[0]!)).toBe("key-9");
  });

  it("refuses a bad key and reports offline", async () => {
    fetchMock.mockResolvedValueOnce(badKey()).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(checkAiKey("nope")).resolves.toMatchObject({ ok: false, reason: "invalid" });
    await expect(checkAiKey("nope")).resolves.toEqual({ ok: false, reason: "offline" });
  });
});
