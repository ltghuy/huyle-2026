"use client";

import { EMPLOYMENT, ROLES, YES_NO } from "@/server/practices/multi-step-form/application.schema";

import { MonthField, RadioGroupField } from "../fields";
import { useFormSelector } from "../form-store";

export function RoleStep() {
  const year = useFormSelector((s) => Number(s.today.slice(0, 4)));

  return (
    <>
      <RadioGroupField path="role.role" label="Role" hint="The questions after Experience depend on it." options={ROLES} />
      <RadioGroupField path="role.employment" label="Type of employment" options={EMPLOYMENT} />
      <MonthField path="role.startMonth" label="When would you like to start?" hint="Within the next 6 months." years={[year, year + 1]} />
      <RadioGroupField
        path="role.needsSponsorship"
        label="Do you need visa sponsorship to work here?"
        hint="If you do, we'll ask a few questions about your work authorization."
        options={YES_NO}
      />
    </>
  );
}
