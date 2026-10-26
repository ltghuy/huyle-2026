"use client";

import { Search, X } from "lucide-react";
import { Fragment, useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { filterErrors } from "@/server/practices/data-grid/grid.query";
import {
  DEPARTMENTS,
  LOCATIONS,
  MAX_SALARY,
  MAX_TEXT_LENGTH,
  STATUSES,
  type Filters,
  type GridView,
} from "@/server/practices/data-grid/grid.schema";

import { formatCount, formatDay, formatMoney } from "./format";
import type { GridController } from "./grid-controller";

const RATINGS = ["1", "2", "3", "4", "5"];

type Chip = { key: keyof Filters | "search"; label: string; ignored?: boolean };

function chipsFor(view: GridView): Chip[] {
  const f = view.filters;
  const errors = filterErrors(f);
  const chips: Chip[] = [];
  if (view.search.trim()) chips.push({ key: "search", label: `Search: “${view.search.trim()}”` });
  if (f.department) chips.push({ key: "department", label: `Department: ${f.department}` });
  if (f.location) chips.push({ key: "location", label: `Location: ${f.location}` });
  if (f.status) chips.push({ key: "status", label: `Status: ${f.status}` });
  if (f.role) chips.push({ key: "role", label: `Role contains “${f.role}”` });
  if (f.salaryMin !== undefined) chips.push({ key: "salaryMin", label: `Salary ≥ ${formatMoney(f.salaryMin)}`, ignored: !!errors.salary });
  if (f.salaryMax !== undefined) chips.push({ key: "salaryMax", label: `Salary ≤ ${formatMoney(f.salaryMax)}`, ignored: !!errors.salary });
  if (f.startFrom) chips.push({ key: "startFrom", label: `Started from ${formatDay(f.startFrom)}`, ignored: !!errors.startDate });
  if (f.startTo) chips.push({ key: "startTo", label: `Started by ${formatDay(f.startTo)}`, ignored: !!errors.startDate });
  if (f.ratingMin !== undefined) chips.push({ key: "ratingMin", label: `Rating ≥ ${f.ratingMin}` });
  return chips;
}

/** "" → no filter; otherwise a whole number within the salary range. */
function parseSalary(raw: string) {
  if (raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(MAX_SALARY, Math.max(0, Math.round(value))) : undefined;
}

export function FilterBar({
  controller,
  view,
  total,
  datasetSize,
  pending,
}: {
  controller: GridController;
  view: GridView;
  total: number;
  datasetSize: number;
  pending: boolean;
}) {
  const id = useId();
  const f = view.filters;
  const errors = filterErrors(f);
  const chips = chipsFor(view);

  function handleRemoveChip(key: Chip["key"]) {
    if (key === "search") controller.setSearch("");
    else controller.setFilter(key, undefined);
  }

  return (
    <section aria-label="Filters" className="flex flex-col gap-3">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <label htmlFor={`${id}-search`} className="sr-only">Search employees</label>
        <Input
          id={`${id}-search`}
          type="search"
          value={view.search}
          maxLength={MAX_TEXT_LENGTH}
          placeholder="Search name, role, department, location or status"
          autoComplete="off"
          className="h-9 pl-8"
          onChange={(e) => controller.setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField id={`${id}-dept`} label="Department" value={f.department ?? ""} options={DEPARTMENTS} onChange={(v) => controller.setFilter("department", v as Filters["department"])} />
        <SelectField id={`${id}-loc`} label="Location" value={f.location ?? ""} options={LOCATIONS} onChange={(v) => controller.setFilter("location", v as Filters["location"])} />
        <SelectField id={`${id}-status`} label="Status" value={f.status ?? ""} options={STATUSES} onChange={(v) => controller.setFilter("status", v as Filters["status"])} />
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-role`} className="text-xs font-medium text-muted-foreground">Role contains</label>
          <Input id={`${id}-role`} value={f.role ?? ""} maxLength={MAX_TEXT_LENGTH} autoComplete="off" placeholder="e.g. engineer" onChange={(e) => controller.setFilter("role", e.target.value, true)} />
        </div>

        <RangeFields
          legend="Start date"
          className="sm:col-span-2"
          error={errors.startDate}
          errorId={`${id}-date-error`}
          from={{ id: `${id}-from`, label: "From", type: "date", value: f.startFrom ?? "", onChange: (v) => controller.setFilter("startFrom", v || undefined) }}
          to={{ id: `${id}-to`, label: "To", type: "date", value: f.startTo ?? "", onChange: (v) => controller.setFilter("startTo", v || undefined) }}
        />
        <RangeFields
          legend="Salary (USD)"
          error={errors.salary}
          errorId={`${id}-salary-error`}
          from={{ id: `${id}-salmin`, label: "Min", type: "number", value: f.salaryMin?.toString() ?? "", onChange: (v) => controller.setFilter("salaryMin", parseSalary(v), true) }}
          to={{ id: `${id}-salmax`, label: "Max", type: "number", value: f.salaryMax?.toString() ?? "", onChange: (v) => controller.setFilter("salaryMax", parseSalary(v), true) }}
        />
        <SelectField
          id={`${id}-rating`}
          label="Rating at least"
          value={f.ratingMin?.toString() ?? ""}
          options={RATINGS}
          onChange={(v) => controller.setFilter("ratingMin", v ? Number(v) : undefined)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <p className={pending ? "text-foreground/60" : "text-foreground/75"}>
          {chips.length ? (
            <>
              <strong className="font-medium text-foreground tabular-nums">{formatCount(total)}</strong> of {formatCount(datasetSize)} employees match
            </>
          ) : (
            <>{formatCount(datasetSize)} employees</>
          )}
        </p>
        {chips.length > 0 ? (
          <>
            <ul className="contents">
              {chips.map((chip) => (
                <li key={chip.key} className="list-none">
                  <Button
                    variant="outline"
                    size="xs"
                    aria-label={`Remove filter ${chip.label}${chip.ignored ? " (ignored)" : ""}`}
                    className={chip.ignored ? "border-dashed text-foreground/60 line-through" : undefined}
                    onClick={() => handleRemoveChip(chip.key)}
                  >
                    {chip.label}
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="xs" onClick={() => controller.clearFilters()}>
              Clear all
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
}

function SelectField({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: readonly string[]; onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-lg border border-input bg-background px-2 text-sm dark:bg-input/30">
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

type RangeInput = { id: string; label: string; type: "number" | "date"; value: string; onChange: (value: string) => void };

function RangeFields({ legend, from, to, error, errorId, className }: {
  legend: string; from: RangeInput; to: RangeInput; error?: string; errorId: string; className?: string;
}) {
  const legendId = `${from.id}-legend`;
  // Same shape as the other fields (one label, then the control) so every
  // control in a row lines up; a <legend> would add its own spacing.
  // "min"/"from" are spoken, the dash shows it.
  return (
    <fieldset aria-labelledby={legendId} className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span id={legendId} className="text-xs font-medium text-muted-foreground">{legend}</span>
      <div className="flex items-center gap-2">
        {[from, to].map((input, i) => (
          <Fragment key={input.id}>
            {i === 1 ? <span aria-hidden className="text-foreground/60">–</span> : null}
            <label htmlFor={input.id} className="sr-only">{`${legend} ${input.label.toLowerCase()}`}</label>
            <Input
              id={input.id}
              type={input.type}
              inputMode={input.type === "number" ? "numeric" : undefined}
              min={input.type === "number" ? 0 : undefined}
              max={input.type === "number" ? MAX_SALARY : undefined}
              step={input.type === "number" ? 1000 : undefined}
              placeholder={input.type === "number" ? input.label : undefined}
              value={input.value}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => input.onChange(e.target.value)}
              className={cn("min-w-0 flex-1", input.type === "date" && "px-1.5")}
            />
          </Fragment>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}; this filter is ignored.
        </p>
      ) : null}
    </fieldset>
  );
}
