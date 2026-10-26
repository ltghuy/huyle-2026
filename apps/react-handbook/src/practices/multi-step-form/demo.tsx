"use client";

import { FileWarning, History, Trash2, Wand2 } from "lucide-react";
import { Suspense, useId, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";
import { OUTCOMES, type Outcome } from "@/server/practices/multi-step-form/application.schema";

import { network } from "./application-api";
import { clearDraft, reloadDraft, resetDraftStatus, SAMPLE_CORRUPT_DRAFT, SAMPLE_V1_DRAFT, writeRawDraft } from "./draft";
import { forgetEmailChecks } from "./email-check";
import { SELECT_CLASS } from "./fields";
import { FormInspector } from "./form-inspector";
import { form } from "./form-store";
import { goToStep } from "./use-step-address";
import { Wizard, WizardSkeleton } from "./wizard";

function handleFillSample() {
  forgetEmailChecks();
  form.fillSample();
  goToStep("review");
}

function handleClearDraft() {
  clearDraft();
  resetDraftStatus();
  toast.info("Draft deleted", { description: "Your answers stay on screen until you reload or change one." });
}

/** Stores a raw draft as if an older version (or a bug) saved it, then loads it like a page load would. */
function loadDraft(raw: string) {
  if (!writeRawDraft(raw)) {
    toast.error("This browser is blocking storage");
    return;
  }
  forgetEmailChecks();
  form.reset();
  goToStep(reloadDraft() ?? "personal");
}

export function Demo() {
  const [latency, setLatency] = useState(network.latencyMs);
  const [outcome, setOutcome] = useState<Outcome>(network.outcome);
  const ids = { latency: useId(), outcome: useId() };

  function handleLatency(value: number) {
    network.latencyMs = value;
    setLatency(value);
  }

  function handleOutcome(value: Outcome) {
    network.outcome = value;
    setOutcome(value);
  }

  return (
    <>
      <DemoControls>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.latency} className="text-xs font-medium text-muted-foreground">
            Server latency: {latency} ms
          </label>
          <input id={ids.latency} type="range" min={0} max={3000} step={100} value={latency} onChange={(e) => handleLatency(Number(e.target.value))} className="h-8 w-32 accent-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.outcome} className="text-xs font-medium text-muted-foreground">
            On submit, the server
          </label>
          <select id={ids.outcome} value={outcome} onChange={(e) => handleOutcome(e.target.value as Outcome)} className={`${SELECT_CLASS} h-8 w-44`}>
            {OUTCOMES.values.map((value) => (
              <option key={value} value={value}>
                {value === "accept" ? "Accepts" : value === "reject-field" ? "Rejects a field" : value === "email-taken" ? "Says email was used" : "Fails (500)"}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleFillSample}>
            <Wand2 aria-hidden /> Fill with sample answers
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearDraft}>
            <Trash2 aria-hidden /> Clear draft
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadDraft(SAMPLE_V1_DRAFT)}>
            <History aria-hidden /> Load a v1 draft
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadDraft(SAMPLE_CORRUPT_DRAFT)}>
            <FileWarning aria-hidden /> Load a corrupted draft
          </Button>
        </div>
      </DemoControls>

      <DemoStage>
        <div className="flex flex-col gap-6">
          {/* useSearchParams needs a Suspense boundary on a prerendered route. */}
          <Suspense fallback={<WizardSkeleton />}>
            <Wizard />
          </Suspense>
          <FormInspector />
        </div>
      </DemoStage>
    </>
  );
}
