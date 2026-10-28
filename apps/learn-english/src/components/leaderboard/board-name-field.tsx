"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NAME_MAX_LENGTH } from "@/learning/name";

interface BoardNameFieldProps {
  id: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}

/** The name shown on the board, with its error under the field (AC-012). */
export function BoardNameField({ id, value, error, onChange }: BoardNameFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Tên hiện trên bảng</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ví dụ: Minh Anh"
        maxLength={NAME_MAX_LENGTH * 2}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-11"
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Bạn có thể dùng biệt danh thay cho tên thật.</p>
      )}
    </div>
  );
}
