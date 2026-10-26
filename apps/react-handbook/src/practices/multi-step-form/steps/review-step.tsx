"use client";

import { Pencil, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AUTH_STATUS,
  COUNTRIES,
  DESIGN_TOOLS,
  EMPLOYMENT,
  formatMonth,
  LANGUAGES,
  ROLES,
  SOURCES,
  YES_NO,
  type ApplicationValues,
  type StepId,
} from "@/server/practices/multi-step-form/application.schema";

import { CheckboxField, ERROR_TEXT } from "../fields";
import { useFormSelector } from "../form-store";
import { STEPS } from "../steps";

type Row = { label: string; value: React.ReactNode };

const label = (labels: Record<string, string>, value: string) => labels[value] ?? (value || "—");
const list = (labels: Record<string, string>, values: string[]) => (values.length > 0 ? values.map((v) => labels[v] ?? v).join(", ") : "—");
const money = (value: string) => (/^\d+$/.test(value) ? `$${Number(value).toLocaleString("en-US")}` : value || "—");

/** The answers of one step as label/value rows. */
function rowsFor(step: StepId, v: ApplicationValues): Row[] {
  switch (step) {
    case "personal":
      return [
        { label: "Full name", value: v.personal.fullName },
        { label: "Email", value: v.personal.email },
        { label: "Phone", value: v.personal.phone || "Not given" },
        { label: "Country", value: label(COUNTRIES.labels, v.personal.country) },
      ];
    case "role":
      return [
        { label: "Role", value: label(ROLES.labels, v.role.role) },
        { label: "Employment", value: label(EMPLOYMENT.labels, v.role.employment) },
        { label: "Start", value: formatMonth(v.role.startMonth) },
        { label: "Needs sponsorship", value: label(YES_NO.labels, v.role.needsSponsorship) },
      ];
    case "experience":
      if (v.experience.none) return [{ label: "Experience", value: "No work experience yet" }];
      return v.experience.entries.map((e, i) => ({
        label: `Job ${i + 1}`,
        value: `${e.title} at ${e.company}, ${formatMonth(e.startMonth)} – ${e.current ? "now" : formatMonth(e.endMonth)}`,
      }));
    case "engineering":
      return [
        { label: "Languages", value: list(LANGUAGES.labels, v.engineering.languages) },
        { label: "Years of experience", value: v.engineering.years },
        { label: "Code profile", value: v.engineering.profileUrl || "Not given" },
      ];
    case "design":
      return [
        { label: "Portfolio", value: v.design.portfolioUrl },
        { label: "Tools", value: list(DESIGN_TOOLS.labels, v.design.tools) },
      ];
    case "authorization":
      return [
        { label: "Lives in", value: label(COUNTRIES.labels, v.authorization.residence) },
        { label: "Status", value: label(AUTH_STATUS.labels, v.authorization.status) },
        { label: "Earliest legal start", value: formatMonth(v.authorization.earliestMonth) },
      ];
    case "extras":
      return [
        { label: "Cover letter", value: <span className="line-clamp-3 whitespace-pre-line">{v.extras.coverLetter}</span> },
        { label: "Expected salary", value: `${money(v.extras.salaryMin)} – ${money(v.extras.salaryMax)}` },
        { label: "Heard about us", value: v.extras.source ? label(SOURCES.labels, v.extras.source) : "Not given" },
      ];
    case "review":
      return [];
  }
}

function ReviewGroup({ step, onEdit }: { step: StepId; onEdit: (step: StepId) => void }) {
  const values = useFormSelector((s) => s.values);
  const rows = rowsFor(step, values);
  const title = STEPS[step].title;

  return (
    <section aria-labelledby={`msf-review-${step}`} className="rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <h3 id={`msf-review-${step}`} className="text-sm font-medium">
          {title}
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(step)}>
          <Pencil aria-hidden /> Edit<span className="sr-only"> {title.toLowerCase()}</span>
        </Button>
      </div>
      <dl className="grid gap-x-4 gap-y-2 px-4 py-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ReviewStep({ steps, onEdit, onRetry }: { steps: StepId[]; onEdit: (step: StepId) => void; onRetry: () => void }) {
  const failure = useFormSelector((s) => (s.submit.status === "failed" ? s.submit.message : null));

  return (
    <>
      {steps
        .filter((step) => step !== "review")
        .map((step) => (
          <ReviewGroup key={step} step={step} onEdit={onEdit} />
        ))}
      <CheckboxField path="review.consent" label="I confirm that my answers are accurate and complete" />
      {failure ? (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm">
          <p className={cn("flex items-start gap-2 font-medium", ERROR_TEXT)}>
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> {failure}
          </p>
          <p className="text-muted-foreground">Nothing was lost: your answers are still here and saved.</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </>
  );
}
