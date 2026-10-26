"use client";

// Form controls bound to the form store by path. Each one ties its label,
// hint and error to the control (aria-describedby, aria-invalid,
// aria-required), and marks the field visited when focus leaves it, which
// is when its error starts to show.

import { CircleAlert } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { errorId, fieldId } from "./paths";
import { form, useField } from "./form-store";

/** Destructive text darkened in light mode, so small error text meets contrast. */
export const ERROR_TEXT = "text-[color-mix(in_oklch,var(--destructive),black_30%)] dark:text-destructive";

type Options = { values: readonly string[]; labels: Record<string, string> };

type Common = { path: string; label: string; hint?: React.ReactNode; optional?: boolean };

function hintId(path: string) {
  return `${fieldId(path)}-hint`;
}

function describedBy(path: string, hint: unknown, error: string | null, extra?: string) {
  return [hint ? hintId(path) : null, extra ?? null, error ? errorId(path) : null].filter(Boolean).join(" ") || undefined;
}

export const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-background px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50";

function LabelText({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <>
      {label}
      {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
    </>
  );
}

export function FieldError({ path, error }: { path: string; error: string | null }) {
  if (!error) return null;
  return (
    <p id={errorId(path)} className={cn("flex items-start gap-1.5 text-sm", ERROR_TEXT)}>
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="sr-only">Error: </span>
        {error}
      </span>
    </p>
  );
}

function Hint({ path, hint }: { path: string; hint?: React.ReactNode }) {
  if (!hint) return null;
  return (
    <p id={hintId(path)} className="text-sm text-muted-foreground">
      {hint}
    </p>
  );
}

/** Marks a group visited when focus leaves it (not when it moves inside it). */
function handleGroupBlur(path: string, event: React.FocusEvent<HTMLElement>) {
  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) form.visit(path);
}

export function TextField({
  path,
  label,
  hint,
  optional,
  status,
  onChangeValue,
  onLeave,
  ...input
}: Common & {
  status?: React.ReactNode;
  /** Also told about every change (e.g. to start an async check). */
  onChangeValue?: (value: string) => void;
  onLeave?: (value: string) => void;
} & Pick<React.ComponentProps<"input">, "type" | "autoComplete" | "inputMode" | "spellCheck">) {
  const { value, error } = useField(path);
  const id = fieldId(path);
  const statusId = status ? `${id}-status` : undefined;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    form.setValue(path, event.target.value);
    onChangeValue?.(event.target.value);
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    form.visit(path);
    onLeave?.(event.target.value);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        <LabelText label={label} optional={optional} />
      </Label>
      <Hint path={path} hint={hint} />
      <Input
        id={id}
        name={path}
        className="h-10"
        value={String(value ?? "")}
        aria-invalid={error ? true : undefined}
        aria-required={optional ? undefined : true}
        aria-describedby={describedBy(path, hint, error, statusId)}
        onChange={handleChange}
        onBlur={handleBlur}
        {...input}
      />
      {status ? (
        // One line is kept for the status even while it's empty, so a status
        // appearing mid-click can't push the buttons out from under the pointer.
        <p id={statusId} className="flex min-h-5 items-center text-sm text-muted-foreground" aria-live="polite">
          {status}
        </p>
      ) : null}
      <FieldError path={path} error={error} />
    </div>
  );
}

export function TextareaField({ path, label, hint, optional, max }: Common & { max: number }) {
  const { value, error } = useField(path);
  const id = fieldId(path);
  const text = String(value ?? "");
  const countId = `${id}-count`;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        <LabelText label={label} optional={optional} />
      </Label>
      <Hint path={path} hint={hint} />
      <Textarea
        id={id}
        name={path}
        rows={7}
        value={text}
        aria-invalid={error ? true : undefined}
        aria-required={optional ? undefined : true}
        aria-describedby={describedBy(path, hint, error, countId)}
        onChange={(e) => form.setValue(path, e.target.value)}
        onBlur={() => form.visit(path)}
      />
      <p id={countId} className={cn("text-sm tabular-nums", text.trim().length > max ? ERROR_TEXT : "text-muted-foreground")}>
        {text.trim().length} of {max} characters
      </p>
      <FieldError path={path} error={error} />
    </div>
  );
}

export function SelectField({ path, label, hint, optional, options, placeholder }: Common & { options: Options; placeholder: string }) {
  const { value, error } = useField(path);
  const id = fieldId(path);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        <LabelText label={label} optional={optional} />
      </Label>
      <Hint path={path} hint={hint} />
      <select
        id={id}
        name={path}
        className={SELECT_CLASS}
        value={String(value ?? "")}
        aria-invalid={error ? true : undefined}
        aria-required={optional ? undefined : true}
        aria-describedby={describedBy(path, hint, error)}
        onChange={(e) => form.setValue(path, e.target.value)}
        onBlur={() => form.visit(path)}
      >
        <option value="">{placeholder}</option>
        {options.values.map((v) => (
          <option key={v} value={v}>
            {options.labels[v]}
          </option>
        ))}
      </select>
      <FieldError path={path} error={error} />
    </div>
  );
}

export function RadioGroupField({ path, label, hint, options }: Common & { options: Options }) {
  const { value, error } = useField(path);
  const id = fieldId(path);
  const legendId = `${id}-legend`;

  return (
    <fieldset id={id} className="flex flex-col gap-2" onBlur={(e) => handleGroupBlur(path, e)}>
      <legend id={legendId} className="mb-1.5 text-sm font-medium">
        {label}
      </legend>
      <Hint path={path} hint={hint} />
      <RadioGroup
        value={String(value ?? "")}
        onValueChange={(next) => form.setValue(path, next)}
        aria-labelledby={legendId}
        aria-invalid={error ? true : undefined}
        aria-required
        aria-describedby={describedBy(path, hint, error)}
        className="flex flex-wrap gap-x-6 gap-y-3"
      >
        {options.values.map((v) => (
          <Label key={v} className="min-h-6 cursor-pointer font-normal">
            <RadioGroupItem value={v} aria-invalid={error ? true : undefined} />
            {options.labels[v]}
          </Label>
        ))}
      </RadioGroup>
      <FieldError path={path} error={error} />
    </fieldset>
  );
}

export function CheckboxField({ path, label, hint }: Omit<Common, "optional">) {
  const { value, error } = useField(path);
  const id = fieldId(path);

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="min-h-6 cursor-pointer font-normal">
        <Checkbox
          id={id}
          checked={value === true}
          onCheckedChange={(checked) => form.setValue(path, checked === true)}
          onBlur={() => form.visit(path)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(path, hint, error)}
        />
        {label}
      </Label>
      <Hint path={path} hint={hint} />
      <FieldError path={path} error={error} />
    </div>
  );
}

export function CheckboxGroupField({ path, label, hint, options }: Common & { options: Options }) {
  const { value, error } = useField(path);
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const id = fieldId(path);

  function handleToggle(option: string, checked: boolean) {
    const next = checked ? [...selected, option] : selected.filter((v) => v !== option);
    // Keep the list order, not the click order.
    form.setValue(path, options.values.filter((v) => next.includes(v)));
  }

  return (
    <fieldset id={id} className="flex flex-col gap-2" aria-describedby={describedBy(path, hint, error)} onBlur={(e) => handleGroupBlur(path, e)}>
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <Hint path={path} hint={hint} />
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {options.values.map((v) => (
          <Label key={v} className="min-h-6 cursor-pointer font-normal">
            <Checkbox
              checked={selected.includes(v)}
              onCheckedChange={(checked) => handleToggle(v, checked === true)}
              aria-invalid={error ? true : undefined}
            />
            {options.labels[v]}
          </Label>
        ))}
      </div>
      <FieldError path={path} error={error} />
    </fieldset>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * A month as two selects ("YYYY-MM"). A half-picked value ("2026-" or
 * "-03") is kept so the other half can follow; the rules ask for both.
 */
export function MonthField({ path, label, hint, years }: Omit<Common, "optional"> & { years: number[] }) {
  const { value, error } = useField(path);
  const [year = "", month = ""] = String(value ?? "").split("-");
  const id = fieldId(path);
  const legendId = `${id}-legend`;
  const invalid = error ? true : undefined;
  const described = describedBy(path, hint, error);

  function handleChange(nextYear: string, nextMonth: string) {
    form.setValue(path, nextYear || nextMonth ? `${nextYear}-${nextMonth}` : "");
  }

  return (
    <fieldset id={id} className="flex flex-col gap-1.5" onBlur={(e) => handleGroupBlur(path, e)}>
      <legend id={legendId} className="mb-1.5 text-sm font-medium">
        {label}
      </legend>
      <Hint path={path} hint={hint} />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] gap-2">
        <select
          aria-label={`${label}: month`}
          className={SELECT_CLASS}
          value={month}
          aria-invalid={invalid}
          aria-required
          aria-describedby={described}
          onChange={(e) => handleChange(year, e.target.value)}
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, "0")}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label}: year`}
          className={SELECT_CLASS}
          value={year}
          aria-invalid={invalid}
          aria-required
          aria-describedby={described}
          onChange={(e) => handleChange(e.target.value, month)}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <FieldError path={path} error={error} />
    </fieldset>
  );
}
