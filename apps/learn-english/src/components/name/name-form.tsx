"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cleanName, NAME_MAX_LENGTH } from "@/learning/name";
import { cn } from "@/lib/utils";
import { updateProfile } from "@/storage/meta";

export const NAME_ERROR = `Bạn nhập tên của mình nhé (tối đa ${NAME_MAX_LENGTH} ký tự).`;

interface NameFormProps {
  id: string;
  label: string;
  initialName?: string;
  submitLabel: string;
  /** After the name is stored, with the cleaned name. */
  onSaved?: (name: string) => void;
  /** Stack the button under the field (dialog) instead of beside it (settings). */
  stacked?: boolean;
  autoFocus?: boolean;
}

/** Name field with the shared rule (AC-003), saved to the profile (AC-004). */
export function NameForm({ id, label, initialName = "", submitLabel, onSaved, stacked = false, autoFocus = false }: NameFormProps) {
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const errorId = `${id}-error`;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = cleanName(value);
    if (!name) {
      setError(NAME_ERROR);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ displayName: name }, Date.now());
      setValue(name);
      onSaved?.(name);
    } catch {
      toast.error("Chưa lưu được tên. Bạn thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  function handleChange(next: string) {
    setValue(next);
    if (error) setError(null);
  }

  return (
    <form className="grid gap-2" onSubmit={handleSubmit} noValidate>
      <Label htmlFor={id}>{label}</Label>
      <div className={cn("flex gap-2", stacked ? "flex-col" : "flex-wrap")}>
        <Input
          id={id}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Ví dụ: Minh Anh"
          autoComplete="name"
          autoFocus={autoFocus}
          maxLength={NAME_MAX_LENGTH * 2}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn("h-11", !stacked && "max-w-72")}
        />
        <Button type="submit" size="lg" className="h-11 px-5" disabled={saving}>
          {submitLabel}
        </Button>
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
