"use client";

import { LANGUAGES, MAX_LANGUAGES } from "@/server/practices/multi-step-form/application.schema";

import { CheckboxGroupField, TextField } from "../fields";

export function EngineeringStep() {
  return (
    <>
      <CheckboxGroupField path="engineering.languages" label="Languages you use most" hint={`Choose 1 to ${MAX_LANGUAGES}.`} options={LANGUAGES} />
      <TextField path="engineering.years" label="Years of professional experience" inputMode="numeric" hint="A whole number, like 4." />
      <TextField path="engineering.profileUrl" label="Code profile link" optional type="url" hint="GitHub, GitLab or similar, starting with https://" spellCheck={false} />
    </>
  );
}
