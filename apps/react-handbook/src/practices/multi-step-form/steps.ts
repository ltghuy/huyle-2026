// Which steps exist, which apply, and which can be opened. Nothing here is
// stored: it's all derived from the answers, so the progress indicator,
// navigation, review and draft can never disagree with them.

import {
  applicableStepIds,
  STEP_IDS,
  validateStep,
  type ApplicationValues,
  type FieldIssue,
  type StepId,
} from "@/server/practices/multi-step-form/application.schema";

export type StepDef = { id: StepId; title: string; intro: string };

export const STEPS: Record<StepId, StepDef> = {
  personal: { id: "personal", title: "Personal details", intro: "How we can reach you." },
  role: { id: "role", title: "Role", intro: "The job you're applying for and when you could start." },
  experience: { id: "experience", title: "Experience", intro: "Your recent jobs, newest first. Up to five." },
  engineering: { id: "engineering", title: "Engineering questions", intro: "A few questions for engineering applicants." },
  design: { id: "design", title: "Design questions", intro: "A few questions for design applicants." },
  authorization: { id: "authorization", title: "Work authorization", intro: "Because you need visa sponsorship." },
  extras: { id: "extras", title: "Cover letter and salary", intro: "Why you, and what you expect." },
  review: { id: "review", title: "Review", intro: "Check your answers before you send them." },
};

const order = (step: StepId) => STEP_IDS.indexOf(step);

/** Issues per step, cached per values object (values are immutable). */
const issueCache = new WeakMap<ApplicationValues, Map<string, FieldIssue[]>>();

export function stepIssues(step: StepId, values: ApplicationValues, today: string): FieldIssue[] {
  let byStep = issueCache.get(values);
  if (!byStep) {
    byStep = new Map();
    issueCache.set(values, byStep);
  }
  const key = `${step}|${today}`;
  let issues = byStep.get(key);
  if (!issues) {
    issues = validateStep(step, values, today);
    byStep.set(key, issues);
  }
  return issues;
}

export function isStepValid(step: StepId, values: ApplicationValues, today: string) {
  return stepIssues(step, values, today).length === 0;
}

export const applicableSteps = applicableStepIds;

/**
 * Steps that can be opened: applicable steps in order, up to and including
 * the first invalid one, and never past the furthest step reached.
 */
export function reachableSteps(values: ApplicationValues, furthest: StepId, today: string): StepId[] {
  const reachable: StepId[] = [];
  for (const step of applicableSteps(values)) {
    if (order(step) > order(furthest)) break;
    reachable.push(step);
    if (!isStepValid(step, values, today)) break;
  }
  return reachable;
}

/** The step to show for a requested one: itself if reachable, else the furthest reachable step. */
export function allowedStep(requested: StepId | null, values: ApplicationValues, furthest: StepId, today: string): StepId {
  const reachable = reachableSteps(values, furthest, today);
  return requested && reachable.includes(requested) ? requested : reachable.at(-1)!;
}

export function firstInvalidStep(values: ApplicationValues, today: string): StepId | null {
  return applicableSteps(values).find((step) => !isStepValid(step, values, today)) ?? null;
}

export function nextStep(step: StepId, values: ApplicationValues): StepId | null {
  const steps = applicableSteps(values);
  return steps[steps.indexOf(step) + 1] ?? null;
}

export function laterOf(a: StepId, b: StepId): StepId {
  return order(a) >= order(b) ? a : b;
}

export type StepStatus = "current" | "complete" | "attention" | "incomplete" | "locked";

/**
 * For the progress indicator: complete when valid, "needs attention" when
 * invalid after a Next or Submit was tried there, locked when not reachable.
 */
export function stepStatus(
  step: StepId,
  current: StepId,
  ctx: { values: ApplicationValues; furthest: StepId; attempted: ReadonlySet<StepId>; today: string },
): StepStatus {
  if (step === current) return "current";
  const valid = isStepValid(step, ctx.values, ctx.today);
  // A step that was finished and broke since (e.g. the cross-step rule) needs attention even
  // when an earlier step now locks it; a valid step behind an unfinished one is just locked.
  const attention = !valid && ctx.attempted.has(step);
  if (!reachableSteps(ctx.values, ctx.furthest, ctx.today).includes(step)) {
    return attention && order(step) <= order(ctx.furthest) ? "attention" : "locked";
  }
  if (valid) return step === "review" ? "incomplete" : "complete";
  return attention ? "attention" : "incomplete";
}

/** Only the answers of steps that apply: what's saved and sent. */
export function applicableSlice(values: ApplicationValues): Partial<ApplicationValues> {
  return Object.fromEntries(applicableSteps(values).map((step) => [step, values[step]])) as Partial<ApplicationValues>;
}
