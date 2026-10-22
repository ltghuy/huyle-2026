"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SelectOption<T extends string> = { value: T; label: string };

/** A labelled shadcn select for the SEO demos. */
export function FieldSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: React.ReactNode;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();

  function handleValueChange(next: T | null) {
    if (next) onChange(next);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select items={options} value={value} onValueChange={handleValueChange}>
        <SelectTrigger id={id} className="w-full min-w-0 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
