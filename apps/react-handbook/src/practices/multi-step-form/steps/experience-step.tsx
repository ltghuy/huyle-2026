"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { emptyEntry, MAX_ENTRIES, type ExperienceEntry } from "@/server/practices/multi-step-form/application.schema";

import { CheckboxField, FieldError, MonthField, TextField } from "../fields";
import { form, useField, useFormSelector } from "../form-store";
import { fieldId, focusField } from "../paths";

const ENTRIES = "experience.entries";
let nextEntry = 1;

function entries(): ExperienceEntry[] {
  return form.get().values.experience.entries;
}

/** Applies a new list synchronously, so focus can move to the right control right after. */
function replaceEntries(next: ExperienceEntry[]) {
  flushSync(() => {
    form.setValue(ENTRIES, next);
    form.unvisit(ENTRIES);
  });
}

function handleAdd() {
  const list = entries();
  replaceEntries([...list, emptyEntry(`entry-${Date.now()}-${nextEntry++}`)]);
  focusField(`${ENTRIES}.${list.length}.company`);
}

function handleRemove(index: number) {
  const list = entries();
  replaceEntries(list.filter((_, i) => i !== index));
  // Focus the job that took its place, the one before it, or the Add button.
  const target = list.length === 1 ? ENTRIES : `${ENTRIES}.${Math.min(index, list.length - 2)}.company`;
  focusField(target);
}

function handleMove(index: number, by: -1 | 1) {
  const list = [...entries()];
  const [moved] = list.splice(index, 1);
  list.splice(index + by, 0, moved);
  replaceEntries(list);
  // Keep focus on the same button of the moved job, or its other move button at the edges.
  const up = document.getElementById(`msf-move-up-${moved.id}`) as HTMLButtonElement | null;
  const down = document.getElementById(`msf-move-down-${moved.id}`) as HTMLButtonElement | null;
  const preferred = by === -1 ? up : down;
  (preferred && !preferred.disabled ? preferred : by === -1 ? down : up)?.focus();
}

function EntryEditor({ index, id, count, years }: { index: number; id: string; count: number; years: number[] }) {
  const base = `${ENTRIES}.${index}`;
  const current = useField(`${base}.current`).value === true;

  return (
    <li>
      <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Job {index + 1}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField path={`${base}.company`} label="Company" autoComplete="organization" />
          <TextField path={`${base}.title`} label="Job title" autoComplete="organization-title" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MonthField path={`${base}.startMonth`} label="Started" years={years} />
          {current ? null : <MonthField path={`${base}.endMonth`} label="Ended" years={years} />}
        </div>
        <CheckboxField path={`${base}.current`} label="I work here now" />
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button id={`msf-move-up-${id}`} type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => handleMove(index, -1)}>
            <ArrowUp aria-hidden /> Move up<span className="sr-only">: job {index + 1}</span>
          </Button>
          <Button id={`msf-move-down-${id}`} type="button" variant="outline" size="sm" disabled={index === count - 1} onClick={() => handleMove(index, 1)}>
            <ArrowDown aria-hidden /> Move down<span className="sr-only">: job {index + 1}</span>
          </Button>
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => handleRemove(index)}>
            <Trash2 aria-hidden /> Remove<span className="sr-only"> job {index + 1}</span>
          </Button>
        </div>
      </fieldset>
    </li>
  );
}

export function ExperienceStep() {
  const ids = useFormSelector((s) => s.values.experience.entries.map((e) => e.id).join(","));
  const none = useFormSelector((s) => s.values.experience.none);
  const year = useFormSelector((s) => Number(s.today.slice(0, 4)));
  const listError = useField(ENTRIES).error;
  const list = ids === "" ? [] : ids.split(",");
  const years = Array.from({ length: 41 }, (_, i) => year - i);
  const full = list.length >= MAX_ENTRIES;

  return (
    <>
      <CheckboxField path="experience.none" label="I don't have work experience yet" hint="Students and career changers are welcome." />
      {none ? (
        list.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Your {list.length === 1 ? "job is" : `${list.length} jobs are`} kept for now but won&apos;t be sent while this is ticked.
          </p>
        ) : null
      ) : (
        <>
          {list.length > 0 ? (
            <ol className="flex flex-col gap-4">
              {list.map((id, i) => (
                <EntryEditor key={id} id={id} index={i} count={list.length} years={years} />
              ))}
            </ol>
          ) : null}
          <div className="flex flex-col items-start gap-1.5">
            <Button
              id={fieldId(ENTRIES)}
              type="button"
              variant="outline"
              disabled={full}
              aria-describedby={full ? "msf-entries-full" : listError ? `${fieldId(ENTRIES)}-error` : undefined}
              onClick={handleAdd}
            >
              <Plus aria-hidden /> {list.length === 0 ? "Add a job" : "Add another job"}
            </Button>
            {full ? (
              <p id="msf-entries-full" className="text-sm text-muted-foreground">
                You&apos;ve added the maximum of {MAX_ENTRIES} jobs. Remove one to add another.
              </p>
            ) : null}
            <FieldError path={ENTRIES} error={listError} />
          </div>
        </>
      )}
    </>
  );
}
