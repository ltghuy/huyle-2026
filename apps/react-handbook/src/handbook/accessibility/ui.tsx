"use client";

import { Check, X } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

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

/** What the simplified reader says. Not a live region: the real page parts are. */
export function ReaderBox({ label = "Screen reader (simplified)", children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-lg border bg-muted/40 p-3", className)}>
      <p className="text-xs font-medium text-foreground/75">{label}</p>
      <div className="font-mono text-xs break-words text-foreground">{children}</div>
    </div>
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

/** Marks the deliberately broken version of a demo. */
export function WrongWay() {
  return <span className="rounded border border-destructive/40 px-1.5 text-[0.6875rem] leading-5 font-medium text-destructive">the wrong way, on purpose</span>;
}

const OBSERVE: MutationObserverInit = { subtree: true, childList: true, attributes: true, characterData: true };

/**
 * A string read from a DOM subtree, re-read whenever that subtree changes.
 * The server snapshot is empty; the first client commit fills it in.
 */
export function useDomSnapshot(ref: React.RefObject<HTMLElement | null>, readSnapshot: (root: HTMLElement) => string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const root = ref.current;
      if (!root) return () => {};
      const observer = new MutationObserver(onChange);
      observer.observe(root, OBSERVE);
      return () => observer.disconnect();
    },
    [ref],
  );
  return useSyncExternalStore(
    subscribe,
    () => (ref.current ? readSnapshot(ref.current) : ""),
    () => "",
  );
}
