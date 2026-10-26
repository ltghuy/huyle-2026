import type {
  EmailCheck,
  FieldIssue,
  Outcome,
  Submission,
} from "@/server/practices/multi-step-form/application.schema";

const BASE = "/api/practices/multi-step-form";
const SUBMIT_TIMEOUT_MS = 30_000;

/** Read at request time, so demo controls apply to the next request. */
export const network = {
  latencyMs: 700,
  outcome: "accept" as Outcome,
};

/** The server rejected answers: each issue names its step and field. */
export class SubmissionRejected extends Error {
  constructor(message: string, readonly issues: FieldIssue[]) {
    super(message);
  }
}

async function post(path: string, body: unknown, signal: AbortSignal) {
  try {
    return await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal.aborted && signal.reason instanceof DOMException && signal.reason.name === "TimeoutError") {
      throw new Error("The server took too long to answer. Your answers are safe; try again.");
    }
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("You seem to be offline. Your answers are safe; try again.");
  }
}

export async function checkEmail(email: string, signal: AbortSignal): Promise<EmailCheck> {
  const res = await post(`/email-check?latencyMs=${network.latencyMs}`, { email }, signal);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json.data;
}

export async function postApplication(body: unknown): Promise<Submission> {
  const params = new URLSearchParams({ latencyMs: String(network.latencyMs), outcome: network.outcome });
  const res = await post(`/applications?${params}`, body, AbortSignal.timeout(SUBMIT_TIMEOUT_MS));
  const json = await res.json().catch(() => null);
  if (res.status === 422 && json?.error?.issues?.fields) throw new SubmissionRejected(json.error.message, json.error.issues.fields);
  if (!res.ok) throw new Error(json?.error?.message ?? `The application couldn't be sent (HTTP ${res.status}).`);
  return json.data;
}
