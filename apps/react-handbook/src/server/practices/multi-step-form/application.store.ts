import "server-only";

import {
  EMAIL_TAKEN,
  monthOf,
  ROLES,
  USED_EMAILS,
  validateApplication,
  type EmailCheck,
  type FieldIssue,
  type Outcome,
  type Submission,
} from "./application.schema";

// Used emails and application numbers survive dev HMR and are shared by
// every route module.
const holder = globalThis as typeof globalThis & {
  __applications?: { next: number; emails: Set<string> };
};
const applications = (holder.__applications ??= { next: 1001, emails: new Set(USED_EMAILS) });

export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(email: string) {
  return email.trim().toLowerCase();
}

/** Server-only rule: one application per email. */
export function checkEmail(email: string): EmailCheck {
  return applications.emails.has(normalize(email)) ? { available: false, message: EMAIL_TAKEN } : { available: true };
}

export type SubmitResult =
  | { ok: true; submission: Submission }
  | { ok: false; status: 422; issues: FieldIssue[] }
  | { ok: false; status: 500; message: string };

/** Re-checks everything with the shared rules plus server-only ones; `outcome` injects demo failures. */
export function submitApplication(body: unknown, outcome: Outcome): SubmitResult {
  if (outcome === "server-error") return { ok: false, status: 500, message: "The application service is unavailable. Try again." };

  const result = validateApplication(body, monthOf(new Date()));
  if (!result.ok) return { ok: false, status: 422, issues: result.issues };

  const { personal, role, experience } = result.data;
  const issues: FieldIssue[] = [];
  if (outcome === "email-taken" || checkEmail(personal!.email).available === false) {
    issues.push({ step: "personal", path: "personal.email", message: EMAIL_TAKEN });
  }
  // Demo: a rule only the server knows, on a field from an earlier step.
  if (outcome === "reject-field") {
    issues.push(
      experience!.entries.length > 0
        ? { step: "experience", path: "experience.entries.0.company", message: "We couldn't verify this employer. Check the spelling or use the company's legal name." }
        : { step: "personal", path: "personal.fullName", message: "Enter your name as it appears on your ID." },
    );
  }
  if (issues.length > 0) return { ok: false, status: 422, issues };

  applications.emails.add(normalize(personal!.email));
  return {
    ok: true,
    submission: {
      applicationId: `APP-${applications.next++}`,
      submittedAt: new Date().toISOString(),
      summary: { fullName: personal!.fullName, email: personal!.email, role: ROLES.labels[role!.role] },
    },
  };
}
