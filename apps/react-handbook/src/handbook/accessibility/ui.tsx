"use client";

import { useCallback, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/** What the simplified reader says. Not a live region: the real page parts are. */
export function ReaderBox({ label = "Screen reader (simplified)", children, className }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-lg border bg-muted/40 p-3", className)}>
      <p className="text-xs font-medium text-foreground/75">{label}</p>
      <div className="font-mono text-xs break-words text-foreground">{children}</div>
    </div>
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
