"use client";

import { DESIGN_TOOLS } from "@/server/practices/multi-step-form/application.schema";

import { CheckboxGroupField, TextField } from "../fields";

export function DesignStep() {
  return (
    <>
      <TextField path="design.portfolioUrl" label="Portfolio link" type="url" hint="Starting with https://" spellCheck={false} />
      <CheckboxGroupField path="design.tools" label="Tools you use" hint="Choose at least one." options={DESIGN_TOOLS} />
    </>
  );
}
