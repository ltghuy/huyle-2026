"use client";

import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ToastItem } from "./toast-item";
import {
  toast,
  toaster,
  useToastState,
  type Toast,
  type ToastPosition,
} from "./toast-store";

const POSITION_CLASSES: Record<ToastPosition, string> = {
  "top-left": "top-4 sm:left-4 sm:right-auto",
  "top-center": "top-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
  "top-right": "top-4 sm:right-4 sm:left-auto",
  "bottom-left": "bottom-4 sm:left-4 sm:right-auto",
  "bottom-center": "bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
  "bottom-right": "bottom-4 sm:right-4 sm:left-auto",
};

const TYPE_LABEL: Record<Toast["type"], string> = {
  success: "Success",
  error: "Error",
  info: "Info",
  warning: "Warning",
  loading: "In progress",
};

export function Toaster() {
  const state = useToastState();
  const { position } = state.settings;
  const edge = position.startsWith("top") ? "top" : "bottom";
  const visible = state.toasts.filter((t) => t.phase === "visible");

  const sectionRef = useRef<HTMLElement>(null);
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const announced = useRef(new Map<string, number>());

  // Announce toasts when they become visible and whenever they update.
  useEffect(() => {
    const polite: string[] = [];
    const assertive: string[] = [];
    const live = new Set<string>();
    for (const t of state.toasts) {
      if (t.phase !== "visible") continue;
      live.add(t.id);
      if (announced.current.get(t.id) === t.version) continue;
      announced.current.set(t.id, t.version);
      const title = /[.!?…]$/.test(t.title) ? t.title : `${t.title}.`;
      const count = t.count > 1 ? ` (${t.count} times)` : "";
      const text = `${TYPE_LABEL[t.type]}: ${title}${count}${t.description ? ` ${t.description}` : ""}`;
      (t.type === "error" ? assertive : polite).push(text);
    }
    for (const id of announced.current.keys()) {
      if (!live.has(id)) announced.current.delete(id);
    }
    for (const [ref, messages] of [
      [politeRef, polite],
      [assertiveRef, assertive],
    ] as const) {
      const region = ref.current;
      if (!region || messages.length === 0) continue;
      // Clear first so identical text is announced again.
      region.textContent = "";
      requestAnimationFrame(() => {
        region.textContent = messages.join(" ");
      });
    }
  }, [state.toasts]);

  // Pause while the tab is hidden.
  useEffect(() => {
    const sync = () =>
      document.hidden ? toaster.pause("hidden") : toaster.resume("hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // A focused toast can be removed from the DOM without a blur event, so
  // re-check after every change whether focus is still inside.
  useEffect(() => {
    if (!sectionRef.current?.contains(document.activeElement)) {
      toaster.resume("focus");
    }
  }, [state.toasts]);

  // F8 jumps to the newest visible toast.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F8") return;
      const cards = sectionRef.current?.querySelectorAll<HTMLElement>(
        '[data-phase="visible"] [data-toast-id]',
      );
      if (!cards?.length) return;
      event.preventDefault();
      if (!sectionRef.current?.contains(document.activeElement)) {
        restoreFocusRef.current = document.activeElement as HTMLElement | null;
      }
      // DOM order is oldest → newest regardless of visual direction.
      cards[cards.length - 1].focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Dismiss a toast and move focus somewhere sensible if it was inside.
  const dismissWithFocus = useCallback((id: string) => {
    const section = sectionRef.current;
    const hadFocus = section?.contains(document.activeElement);
    if (hadFocus) {
      const others = [
        ...(section?.querySelectorAll<HTMLElement>(
          '[data-phase="visible"] [data-toast-id]',
        ) ?? []),
      ].filter((el) => el.dataset.toastId !== id);
      const target = others.at(-1) ?? restoreFocusRef.current;
      if (target?.isConnected) target.focus();
      else (document.activeElement as HTMLElement | null)?.blur();
    }
    toast.dismiss(id);
  }, []);

  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      toaster.resume("focus");
    }
  }

  function handleDismissAll() {
    (document.activeElement as HTMLElement | null)?.blur();
    toast.dismissAll();
  }

  const hasExtras = state.queuedCount > 0 || visible.length > 1;

  return (
    <section
      ref={sectionRef}
      aria-label="Notifications (F8)"
      className={cn(
        "pointer-events-none fixed inset-x-4 z-50 flex sm:w-[22rem]",
        edge === "bottom" ? "flex-col" : "flex-col-reverse",
        POSITION_CLASSES[position],
      )}
      onPointerEnter={() => toaster.pause("hover")}
      onPointerLeave={() => toaster.resume("hover")}
      onFocus={() => toaster.pause("focus")}
      onBlur={handleBlur}
    >
      {hasExtras ? (
        <div className="pointer-events-auto flex items-center justify-between gap-2 px-1 py-1 text-xs text-muted-foreground">
          <span aria-live="off">
            {state.queuedCount > 0 ? `+${state.queuedCount} more` : ""}
          </span>
          <Button size="xs" variant="secondary" onClick={handleDismissAll}>
            Dismiss all
          </Button>
        </div>
      ) : null}

      <ol
        aria-label="Notifications"
        className={cn(
          "pointer-events-auto flex",
          edge === "bottom" ? "flex-col" : "flex-col-reverse",
        )}
      >
        {state.toasts.map((t) => (
          <ToastItem
            key={t.id}
            item={t}
            edge={edge}
            paused={state.paused}
            onEscape={dismissWithFocus}
          />
        ))}
      </ol>

      <div ref={politeRef} role="status" aria-live="polite" className="sr-only" />
      <div ref={assertiveRef} role="alert" aria-live="assertive" className="sr-only" />
    </section>
  );
}

