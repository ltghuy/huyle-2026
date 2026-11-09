import {
  AI_BUDGET_MS,
  AI_GENERATE_URL,
  AI_MODELS_URL,
  buildGradingRequest,
  classifyFailure,
  KEY_CHECK_MS,
  nextPacificMidnight,
  OUTPUT_FORMATS,
  parseGradingReply,
  usableKeys,
  type GradingPrompt,
  type OutputFormat,
  type Verdict,
} from "@/learning/exercises/translate-ai";
import { getAiKeys, updateAiKey } from "@/lib/ai-keys";

// Calls Google straight from the browser with the learner's own key (feature
// 033). The key goes only to generativelanguage.googleapis.com, in a header so
// it never shows in a URL. Nothing here throws: every failure becomes a key
// status or a null verdict, and the runner falls back to matching.

/** The output format Google last accepted; switched for this tab when one is refused as a bad request. */
let format: OutputFormat = OUTPUT_FORMATS[0];

/** A signal aborted by the caller's signal or after `ms`, whichever comes first. */
function withTimeout(signal: AbortSignal | undefined, ms: number): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export type KeyCheck = { ok: true } | { ok: false; reason: "invalid"; reasonVi: string } | { ok: false; reason: "offline" };

/** Asks Google whether the key exists before it is saved (AC-002). A 200 doesn't prove it can generate; grading finds that out. */
export async function checkAiKey(key: string, signal?: AbortSignal): Promise<KeyCheck> {
  const timed = withTimeout(signal, KEY_CHECK_MS);
  try {
    const response = await fetch(AI_MODELS_URL, { headers: { "x-goog-api-key": key.trim() }, signal: timed.signal, referrerPolicy: "no-referrer" });
    if (response.ok) return { ok: true };
    const failure = classifyFailure(response.status, await readJson(response));
    // Only a refusal of the key itself says no; a 429 or 5xx means the key exists.
    return failure.kind === "invalid" ? { ok: false, reason: "invalid", reasonVi: failure.reasonVi } : { ok: true };
  } catch {
    return { ok: false, reason: "offline" };
  } finally {
    timed.done();
  }
}

type Attempt = { verdict: Verdict } | { retry: "format" | "transient" } | { next: true };

/** One call with one key; updates the key's status from Google's answer. */
async function attempt(id: string, key: string, prompt: GradingPrompt, answer: string, signal: AbortSignal, now: () => number): Promise<Attempt> {
  const response = await fetch(AI_GENERATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(buildGradingRequest(prompt, answer, format)),
    signal,
    referrerPolicy: "no-referrer",
  });
  const body = await readJson(response);
  if (response.ok) {
    const verdict = parseGradingReply(body);
    return verdict ? { verdict } : { retry: "transient" };
  }
  const failure = classifyFailure(response.status, body);
  switch (failure.kind) {
    case "quota-day":
      updateAiKey(id, { status: "quota", skipUntil: nextPacificMidnight(now()) });
      return { next: true };
    case "quota-minute":
      updateAiKey(id, { status: "working", skipUntil: now() + failure.retryMs });
      return { next: true };
    case "invalid":
      updateAiKey(id, { status: "invalid", reasonVi: failure.reasonVi });
      return { next: true };
    case "format":
      return { retry: "format" };
    case "transient":
      return { retry: "transient" };
  }
}

/**
 * Grades one answer with the learner's keys, in order, within AI_BUDGET_MS
 * (AC-008, AC-013 to AC-016). A refused key hands over to the next one; a
 * reply that can't be read, or a server error, gets one more key at most, so
 * a bad model day can't use up every key. Returns null when no verdict came:
 * the caller grades by matching instead.
 */
export async function gradeWithAi(prompt: GradingPrompt, answer: string, signal?: AbortSignal, now: () => number = Date.now): Promise<Verdict | null> {
  const timed = withTimeout(signal, AI_BUDGET_MS);
  let transientLeft = 2;
  let formatSwitched = false;
  try {
    const tried = new Set<string>();
    while (!timed.signal.aborted) {
      const next = usableKeys(getAiKeys(), now()).find((key) => !tried.has(key.id));
      if (!next) return null;
      let result: Attempt;
      try {
        result = await attempt(next.id, next.key, prompt, answer, timed.signal, now);
      } catch {
        // Offline, aborted or timed out.
        if (timed.signal.aborted) return null;
        result = { retry: "transient" };
      }
      if ("verdict" in result) return timed.signal.aborted ? null : result.verdict;
      if ("retry" in result && result.retry === "format" && !formatSwitched) {
        // Same key again with the other output field form.
        formatSwitched = true;
        format = format === OUTPUT_FORMATS[0] ? OUTPUT_FORMATS[1] : OUTPUT_FORMATS[0];
        continue;
      }
      if ("retry" in result && --transientLeft <= 0) return null;
      tried.add(next.id);
    }
    return null;
  } finally {
    timed.done();
  }
}

/** Test only: back to the first output format. */
export function resetGeminiClientForTest() {
  format = OUTPUT_FORMATS[0];
}
