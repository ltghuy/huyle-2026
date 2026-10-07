"use client";

import { CircleCheck, Loader2 } from "lucide-react";

import { COUNTRIES } from "@/server/practices/multi-step-form/application.schema";

import { scheduleEmailCheck } from "../email-check";
import { SelectField, TextField } from "../fields";
import { normalizeEmail, useFormSelector } from "../form-store";

function handleEmailLeave(value: string) {
  scheduleEmailCheck(value, { immediate: true });
}

/** What the server said about the email currently typed (a taken email shows as the field's error). */
function EmailStatus() {
  const email = useFormSelector((s) => (s.email.email === normalizeEmail(s.values.personal.email) ? s.email : null));
  if (email?.status === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" /> Checking whether this email was already used…
      </span>
    );
  }
  if (email?.status === "available") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CircleCheck aria-hidden className="size-3.5 text-success" /> No application with this email yet.
      </span>
    );
  }
  if (email?.status === "error") return email.message;
  return null;
}

export function PersonalStep() {
  return (
    <>
      <TextField path="personal.fullName" label="Full name" autoComplete="name" />
      <TextField
        path="personal.email"
        label="Email"
        type="email"
        autoComplete="email"
        spellCheck={false}
        hint="We'll only use it about this application."
        status={<EmailStatus />}
        onChangeValue={scheduleEmailCheck}
        onLeave={handleEmailLeave}
      />
      <TextField path="personal.phone" label="Phone" optional type="tel" autoComplete="tel" hint="Include the country code, like +1 415 555 0100." />
      <SelectField path="personal.country" label="Country you live in" options={COUNTRIES} placeholder="Choose a country" />
    </>
  );
}
