"use client";

import { AUTH_STATUS, COUNTRIES } from "@/server/practices/multi-step-form/application.schema";

import { MonthField, RadioGroupField, SelectField } from "../fields";
import { useFormSelector } from "../form-store";

export function AuthorizationStep() {
  const year = useFormSelector((s) => Number(s.today.slice(0, 4)));

  return (
    <>
      <SelectField path="authorization.residence" label="Country you live in now" options={COUNTRIES} placeholder="Choose a country" />
      <RadioGroupField path="authorization.status" label="Your current status" options={AUTH_STATUS} />
      <MonthField
        path="authorization.earliestMonth"
        label="Earliest month you could legally start"
        hint="Within the next 12 months, and not after the start date you chose on the Role step."
        years={[year, year + 1]}
      />
    </>
  );
}
