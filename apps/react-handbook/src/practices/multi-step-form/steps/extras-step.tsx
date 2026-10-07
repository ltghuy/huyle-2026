"use client";

import { COVER_LETTER, SOURCES } from "@/server/practices/multi-step-form/application.schema";

import { SelectField, TextareaField, TextField } from "../fields";

export function ExtrasStep() {
  return (
    <>
      <TextareaField path="extras.coverLetter" label="Cover letter" hint={`Why this role, and why you. At least ${COVER_LETTER.min} characters.`} max={COVER_LETTER.max} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField path="extras.salaryMin" label="Expected salary, from" inputMode="numeric" hint="Yearly, in US dollars." />
        <TextField path="extras.salaryMax" label="Expected salary, to" inputMode="numeric" hint="Yearly, in US dollars." />
      </div>
      <SelectField path="extras.source" label="How did you hear about us?" optional options={SOURCES} placeholder="Choose an option" />
    </>
  );
}
