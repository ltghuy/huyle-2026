"use client";

import { ArrowLeft, ArrowRight, Loader2, Send, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { confirm } from "@/practices/accessible-modal/modal-store";
import { STEP_IDS, validateApplication, type StepId, type Submission } from "@/server/practices/multi-step-form/application.schema";

import { postApplication, SubmissionRejected } from "./application-api";
import { Confirmation } from "./confirmation";
import { clearDraft, resetDraftStatus, restoreDraft, saveDraft, startAutosave, useDraftStatus } from "./draft";
import { DraftStatus } from "./draft-status";
import { ensureEmailChecked, forgetEmailChecks } from "./email-check";
import { ErrorSummary, SUMMARY_ID } from "./error-summary";
import { form, summaryIssues, useFormSelector } from "./form-store";
import { StepProgress } from "./step-progress";
import { allowedStep, applicableSlice, applicableSteps, firstInvalidStep, nextStep, STEPS } from "./steps";
import { AuthorizationStep } from "./steps/authorization-step";
import { DesignStep } from "./steps/design-step";
import { EngineeringStep } from "./steps/engineering-step";
import { ExperienceStep } from "./steps/experience-step";
import { ExtrasStep } from "./steps/extras-step";
import { PersonalStep } from "./steps/personal-step";
import { ReviewStep } from "./steps/review-step";
import { RoleStep } from "./steps/role-step";
import { addressStep, goToStep, useRequestedStep } from "./use-step-address";

const STEP_VIEWS: Record<Exclude<StepId, "review">, () => React.ReactNode> = {
  personal: PersonalStep,
  role: RoleStep,
  experience: ExperienceStep,
  engineering: EngineeringStep,
  design: DesignStep,
  authorization: AuthorizationStep,
  extras: ExtrasStep,
};

const order = (step: StepId) => STEP_IDS.indexOf(step);

export function WizardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your application" className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <Skeleton className="h-10 lg:h-72" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

/** Restores the draft once, then shows the wizard (a skeleton until then, so step 1 never flashes). */
export function Wizard() {
  const { ready } = useDraftStatus();

  useEffect(() => {
    const step = restoreDraft();
    if (step && addressStep() === null) goToStep(step, { replace: true });
  }, []);

  return ready ? <WizardBody /> : <WizardSkeleton />;
}

type Nav = { current: StepId; steps: string };

function sameNav(a: Nav, b: Nav) {
  return a.current === b.current && a.steps === b.steps;
}

function focusSummary() {
  document.getElementById(SUMMARY_ID)?.focus();
}

/** Marks the step tried (its errors show) and says whether it can be left. */
function checkStep(step: StepId) {
  flushSync(() => form.attempt(step));
  const ok = summaryIssues(form.get(), step).length === 0;
  if (!ok) focusSummary();
  return ok;
}

/** Back to a fresh, empty application. */
function resetApplication() {
  forgetEmailChecks();
  clearDraft();
  form.reset();
  resetDraftStatus();
}

const START_OVER = {
  title: "Start over?",
  description: "This deletes your saved draft and every answer. It can't be undone.",
  confirmLabel: "Start over",
  cancelLabel: "Keep my answers",
  destructive: true,
};

function WizardBody() {
  const requested = useRequestedStep();
  // The step on screen is derived: the address's step if it can be opened, else the furthest one that can.
  const nav = useFormSelector(
    (s): Nav => ({ current: allowedStep(requested, s.values, s.furthest, s.today), steps: applicableSteps(s.values).join(",") }),
    sameNav,
  );
  const steps = nav.steps.split(",") as StepId[];
  const { current } = nav;
  const index = steps.indexOf(current);
  const previous = steps[index - 1] ?? null;
  const submitting = useFormSelector((s) => s.submit.status === "submitting");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [fromReview, setFromReview] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const stepRef = useRef(current);
  const shown = useRef(current);

  // The address names a step that can't be opened: correct it without a new history entry.
  useEffect(() => {
    if (!submission && requested !== current) goToStep(current, { replace: true });
  }, [requested, current, submission]);

  // A new step (Next, Back, the progress list, Edit, or the browser's Back/Forward): save it and focus its heading.
  useEffect(() => {
    stepRef.current = current;
    if (submission) return;
    saveDraft(current);
    if (shown.current !== current) {
      shown.current = current;
      heading.current?.focus();
    }
  }, [current, submission]);

  useEffect(() => startAutosave(() => stepRef.current), []);

  async function handleNext(event: React.FormEvent) {
    event.preventDefault();
    if (checkingEmail || submitting) return;
    if (current === "review") {
      await handleSubmit();
      return;
    }
    if (current === "personal") {
      setCheckingEmail(true);
      await ensureEmailChecked();
      setCheckingEmail(false);
    }
    if (!checkStep(current)) return;
    const next = nextStep(current, form.get().values);
    if (!next) return;
    form.reach(next);
    goToStep(next);
  }

  function handleBack() {
    if (previous) goToStep(previous);
  }

  function handleEdit(step: StepId) {
    setFromReview(true);
    goToStep(step);
  }

  function handleBackToReview() {
    if (!checkStep(current)) return;
    const first = firstInvalidStep(form.get().values, form.get().today);
    if (first && first !== "review") {
      flushSync(() => form.attempt(first));
      goToStep(first);
      return;
    }
    setFromReview(false);
    goToStep("review");
  }

  async function handleSubmit() {
    const s = form.get();
    if (s.submit.status === "submitting") return;
    const body = applicableSlice(s.values);
    if (!validateApplication(body, s.today).ok) {
      // Open the first step that has a problem, with its errors shown.
      const first = firstInvalidStep(s.values, s.today) ?? "review";
      flushSync(() => form.attempt(first));
      if (first === current) focusSummary();
      else goToStep(first);
      return;
    }
    form.setSubmit({ status: "submitting" });
    try {
      const result = await postApplication(body);
      resetDraftStatus();
      clearDraft();
      form.setSubmit({ status: "idle" });
      setSubmission(result);
    } catch (error) {
      if (error instanceof SubmissionRejected) {
        // Issues that name no field (unknown keys) can't be shown on one: report them on Review.
        const unplaced = error.issues.filter((i) => !i.step).map((i) => i.message);
        form.setSubmit(unplaced.length > 0 ? { status: "failed", message: `The server rejected the application: ${unplaced.join(" ")}` } : { status: "idle" });
        form.setServerErrors(error.issues);
        const step = error.issues.map((i) => i.step ?? "review").sort((a, b) => order(a) - order(b))[0];
        if (step === current) focusSummary();
        else goToStep(step);
      } else {
        form.setSubmit({ status: "failed", message: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  async function handleStartOver() {
    if (!(await confirm(START_OVER))) return;
    resetApplication();
    setFromReview(false);
    goToStep("personal");
  }

  function handleStartNew() {
    resetApplication();
    setSubmission(null);
    setFromReview(false);
    goToStep("personal");
  }

  if (submission) return <Confirmation submission={submission} onStartNew={handleStartNew} />;

  const View = current === "review" ? null : STEP_VIEWS[current];

  return (
    <div className="flex flex-col gap-4">
      <DraftStatus onStartOver={handleStartOver} />
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <StepProgress steps={steps} current={current} onSelect={goToStep} />
        <form
          noValidate
          aria-labelledby="msf-step-heading"
          onSubmit={handleNext}
          className="flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-4 md:p-6"
        >
          <header className="flex flex-col gap-1">
            <h2 id="msf-step-heading" ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
              {/* Visible on large screens; below that the progress bar shows it, but focus still announces it. */}
              <span className="sr-only text-sm font-normal text-muted-foreground lg:not-sr-only lg:block">
                Step {index + 1} of {steps.length}
                <span className="sr-only">:</span>
              </span>
              {STEPS[current].title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {STEPS[current].intro}
              {current === "review" ? null : " All fields are required unless marked optional."}
            </p>
          </header>

          <ErrorSummary step={current} />

          <div className="flex max-w-xl flex-col gap-5">
            {View ? <View /> : <ReviewStep steps={steps} onEdit={handleEdit} onRetry={handleSubmit} />}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            {previous ? (
              <Button type="button" variant="outline" className="h-11 px-4 sm:h-9" onClick={handleBack}>
                <ArrowLeft aria-hidden /> Back
              </Button>
            ) : null}
            <div className="ml-auto flex flex-wrap justify-end gap-2">
              {fromReview && current !== "review" ? (
                <Button type="button" variant="outline" className="h-11 px-4 sm:h-9" onClick={handleBackToReview}>
                  <Undo2 aria-hidden /> Back to review
                </Button>
              ) : null}
              <Button type="submit" className="h-11 px-4 sm:h-9" disabled={submitting}>
                {current === "review" ? (
                  submitting ? (
                    <>
                      <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send aria-hidden /> Submit application
                    </>
                  )
                ) : checkingEmail ? (
                  <>
                    <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" /> Checking email…
                  </>
                ) : (
                  <>
                    Next <ArrowRight aria-hidden />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
