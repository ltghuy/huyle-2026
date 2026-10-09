"use client";

import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

// Small pieces shared by the handbook demos.

/** A checkbox card for a demo setting. */
export function Toggle({
  checked,
  onCheckedChange,
  title,
  detail,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        checked ? "border-primary/40 bg-primary/5" : "border-dashed",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary outline-none"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        {detail ? <span className="text-xs text-foreground/75">{detail}</span> : null}
      </span>
    </label>
  );
}

/** Pass/fail in words with an icon, never color alone. */
export function Verdict({ pass, children }: { pass: boolean; children?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", pass ? "text-success" : "text-destructive")}>
      {pass ? <Check aria-hidden className="size-4" /> : <X aria-hidden className="size-4" />}
      {children ?? (pass ? "Pass" : "Fail")}
    </span>
  );
}
