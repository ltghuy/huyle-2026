// Asks the server whether an email was already used, while the applicant
// types: debounced, one request at a time (the previous one is aborted),
// and an answer is applied only if it's for the latest request, so a slow
// answer for an older value can never overwrite a newer one.

import { stepSchemas, type EmailCheck } from "@/server/practices/multi-step-form/application.schema";

import { checkEmail } from "./application-api";
import { form, normalizeEmail, type EmailStatus } from "./form-store";

const DEBOUNCE_MS = 500;
const emailRule = stepSchemas("2000-01").personal.shape.email;
const UNREACHABLE = "Couldn't check whether this email was already used. We'll try again when you continue.";

/** Answers for this visit: an email is checked once. */
const answers = new Map<string, EmailCheck>();
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | null = null;
let latest = 0;
let pending: Promise<EmailStatus> | null = null;

function looksValid(email: string) {
  return emailRule.safeParse(email).success;
}

function apply(email: string, answer: EmailCheck): EmailStatus {
  const status = answer.available ? "available" : "taken";
  form.setEmail({ email, status, message: answer.message });
  return status;
}

function run(email: string): Promise<EmailStatus> {
  controller?.abort();
  const own = (controller = new AbortController());
  const id = ++latest;
  form.setEmail({ email, status: "checking" });
  pending = checkEmail(email, own.signal).then(
    (answer) => {
      answers.set(email, answer);
      // A newer request was started: this answer is stale.
      if (id !== latest) return form.get().email.status;
      return apply(email, answer);
    },
    () => {
      if (own.signal.aborted || id !== latest) return form.get().email.status;
      form.setEmail({ email, status: "error", message: UNREACHABLE });
      return "error";
    },
  );
  return pending;
}

/** Called on every change (debounced) and when the field is left (immediately). */
export function scheduleEmailCheck(raw: string, { immediate = false } = {}) {
  const email = normalizeEmail(raw);
  clearTimeout(timer);
  if (!looksValid(email)) {
    controller?.abort();
    latest++;
    form.setEmail({ email, status: "idle" });
    return;
  }
  const known = answers.get(email);
  if (known) {
    controller?.abort();
    latest++;
    apply(email, known);
    return;
  }
  if (immediate) void run(email);
  else timer = setTimeout(() => void run(email), DEBOUNCE_MS);
}

/**
 * For Next on the Personal step: the server rule is never skipped. Waits
 * for a pending check, starts one that's only scheduled, and retries once
 * after a network error.
 */
export async function ensureEmailChecked(): Promise<EmailStatus> {
  const email = normalizeEmail(form.get().values.personal.email);
  if (!looksValid(email)) return "idle";
  const known = answers.get(email);
  if (known) return apply(email, known);
  const current = form.get().email;
  if (current.email === email && current.status === "checking" && pending) {
    const status = await pending;
    if (status !== "error") return form.get().email.email === email ? form.get().email.status : status;
  }
  clearTimeout(timer);
  const status = await run(email);
  return status === "error" ? run(email) : status;
}

export function forgetEmailChecks() {
  clearTimeout(timer);
  controller?.abort();
  latest++;
  answers.clear();
}
