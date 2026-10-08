"use client";

import { CircleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { accessibleName, announce } from "./a11y-reader";
import { ReaderBox, WrongWay } from "./ui";

type Version = "bad" | "good";
type Field = "name" | "email" | "delivery";
type Values = { name: string; email: string; delivery: string };
type Errors = Partial<Record<Field, string>>;

const EMPTY: Values = { name: "", email: "", delivery: "" };
const FIELD_ID: Record<Field, string> = { name: "forms-name", email: "forms-email", delivery: "forms-delivery-pickup" };
const DELIVERY = [
  { id: "pickup", label: "Pick up at the shop" },
  { id: "delivery", label: "Deliver to my address" },
];

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter an email address like name@example.com.";
  if (!values.delivery) errors.delivery = "Choose pick up or delivery.";
  return errors;
}

/** The announcement, with the group a radio sits in, and a note when the name only comes from the placeholder. */
function describe(el: Element) {
  const group = el.closest("fieldset");
  const line = group && el !== group ? `${announce(group)}; ${announce(el)}` : announce(el);
  return accessibleName(el).from === "placeholder" ? `${line}  ← name comes from the placeholder, which disappears as you type` : line;
}

export function FormsDemo() {
  const [version, setVersion] = useState<Version>("good");
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors | null>(null);
  const [line, setLine] = useState("Focus a field to hear it.");
  const [saved, setSaved] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const good = version === "good";
  const problems = errors ? (Object.entries(errors) as [Field, string][]) : [];

  function handleVersion(next: Version) {
    setVersion(next);
    setErrors(null);
    setSaved(false);
    setLine("Focus a field to hear it.");
  }

  function handleChange(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(values);
    const hasErrors = Object.keys(found).length > 0;
    flushSync(() => {
      setErrors(found);
      setSaved(!hasErrors);
    });
    if (hasErrors && good) summaryRef.current?.focus();
  }

  function handleJump(event: React.MouseEvent, field: Field) {
    event.preventDefault();
    document.getElementById(FIELD_ID[field])?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Version</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="forms-version" checked={!good} onChange={() => handleVersion("bad")} className="size-4 accent-primary" />
            Placeholders and red borders <WrongWay />
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="forms-version" checked={good} onChange={() => handleVersion("good")} className="size-4 accent-primary" />
            Labels, hints and text errors
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <form noValidate aria-label="Order details" onSubmit={handleSubmit} onFocus={(e) => setLine(describe(e.target))} className="flex min-w-0 flex-col gap-4 rounded-lg border p-4">
          {good && problems.length > 0 ? (
            <div ref={summaryRef} tabIndex={-1} role="group" aria-labelledby="forms-summary-title" className="rounded-lg border border-destructive/50 p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <p id="forms-summary-title" className="font-medium text-destructive">
                There {problems.length === 1 ? "is 1 problem" : `are ${problems.length} problems`} with your details
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {problems.map(([field, message]) => (
                  <li key={field}>
                    <a href={`#${FIELD_ID[field]}`} onClick={(e) => handleJump(e, field)} className="underline underline-offset-4">
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {good ? (
            <GoodFields values={values} errors={errors ?? {}} onChange={handleChange} />
          ) : (
            <BadFields values={values} errors={errors ?? {}} onChange={handleChange} />
          )}

          <Button type="submit" className="w-fit">
            Place order
          </Button>
          <p role="status" className="text-sm font-medium text-success">
            {saved ? "Thanks, your order details are saved." : ""}
          </p>
        </form>
        <ReaderBox className="h-fit">{line}</ReaderBox>
      </div>
    </div>
  );
}

type FieldsProps = { values: Values; errors: Errors; onChange: (field: Field, value: string) => void };

function BadFields({ values, errors, onChange }: FieldsProps) {
  const red = (field: Field) => (errors[field] ? "border-destructive" : undefined);
  return (
    <>
      <Input id={FIELD_ID.name} placeholder="Full name" value={values.name} className={red("name")} onChange={(e) => onChange("name", e.target.value)} />
      <Input id={FIELD_ID.email} placeholder="Email" value={values.email} className={red("email")} onChange={(e) => onChange("email", e.target.value)} />
      <div className={cn("flex flex-col gap-1.5 rounded-md border border-transparent p-1 text-sm", errors.delivery && "border-destructive")}>
        <span className="font-medium">How do you want your order?</span>
        {DELIVERY.map((option) => (
          <label key={option.id} className="flex items-center gap-2">
            <input
              id={`forms-delivery-${option.id}`}
              type="radio"
              name="forms-delivery"
              checked={values.delivery === option.id}
              onChange={() => onChange("delivery", option.id)}
              className="size-4 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
    </>
  );
}

function GoodFields({ values, errors, onChange }: FieldsProps) {
  return (
    <>
      <TextField id={FIELD_ID.name} label="Full name" autoComplete="name" value={values.name} error={errors.name} onChange={(value) => onChange("name", value)} />
      <TextField
        id={FIELD_ID.email}
        label="Email"
        type="email"
        autoComplete="email"
        hint="We send the receipt here."
        value={values.email}
        error={errors.email}
        onChange={(value) => onChange("email", value)}
      />
      <fieldset aria-describedby={errors.delivery ? "forms-delivery-error" : undefined} className="flex flex-col gap-1.5 text-sm">
        <legend className="mb-1 font-medium">How do you want your order?</legend>
        {DELIVERY.map((option) => (
          <label key={option.id} className="flex items-center gap-2">
            <input
              id={`forms-delivery-${option.id}`}
              type="radio"
              name="forms-delivery"
              required
              checked={values.delivery === option.id}
              onChange={() => onChange("delivery", option.id)}
              className="size-4 accent-primary"
            />
            {option.label}
          </label>
        ))}
        {errors.delivery ? <ErrorText id="forms-delivery-error">{errors.delivery}</ErrorText> : null}
      </fieldset>
    </>
  );
}

function TextField({
  id,
  label,
  hint,
  error,
  value,
  type = "text",
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  value: string;
  type?: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-foreground/75">
          {hint}
        </p>
      ) : null}
      <Input
        id={id}
        type={type}
        required
        autoComplete={autoComplete}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <ErrorText id={`${id}-error`}>{error}</ErrorText> : null}
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1 text-xs font-medium text-destructive">
      <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {children}
    </p>
  );
}
