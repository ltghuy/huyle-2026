"use client";

import { X } from "lucide-react";
import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  getModalRoot,
  popLayer,
  pushLayer,
  requestClose,
  type CloseReason,
  type Layer,
} from "./modal-engine";
import { useModalSettings } from "./modal-store";

/**
 * The shadcn destructive button is red on a 10% red tint: 4.1:1 in light
 * mode. Darken its text (from the theme token) so it passes 4.5:1.
 */
export const DESTRUCTIVE_TEXT = "text-[color-mix(in_oklch,var(--destructive),black_30%)] dark:text-destructive";

/** Exit fallback in case `transitionend` never fires. */
const EXIT_TIMEOUT = 250;
const PHONE = "(max-width: 639px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const SIZES = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

const ROOT = {
  dialog: "items-center justify-center p-4",
  sheet: "items-end justify-stretch pb-[var(--modal-kb,0px)]",
};

const PANEL = {
  dialog:
    "w-full rounded-xl max-h-[min(85dvh,calc(var(--modal-vh,100dvh)-2rem))] starting:scale-96 starting:opacity-0 data-[state=closing]:scale-96 data-[state=closing]:opacity-0",
  sheet:
    "w-full max-w-none! rounded-t-2xl border-x-0 border-b-0 max-h-[min(92dvh,var(--modal-vh,100dvh))] pb-[env(safe-area-inset-bottom)] starting:translate-y-full data-[state=closing]:translate-y-full",
};

const FOOTER = {
  dialog: "flex-row justify-end",
  sheet: "flex-col-reverse [&>*]:h-11 [&>*]:w-full",
};

type Phase = "open" | "closing" | "closed";

export type ModalProps = {
  open: boolean;
  /** Escape, backdrop or ×: the owner decides whether to close. */
  onRequestClose: (reason: CloseReason) => void;
  /** Called once the dialog has finished closing and is removed. */
  onExited?: () => void;
  title: string;
  description?: React.ReactNode;
  role?: "dialog" | "alertdialog";
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZES;
  showClose?: boolean;
  /** Overrides the demo setting (alert dialogs pass false). */
  backdropDismiss?: boolean;
  initialFocus?: () => HTMLElement | null;
  returnFocus?: () => HTMLElement | null;
  /** Element to focus first instead of the first control: the title. */
  focusTitle?: boolean;
  /** Makes a long body a labelled region that keyboard users can scroll. */
  bodyLabel?: string;
};

export function Modal({
  open, onRequestClose, onExited, title, description, role = "dialog", children, footer, size = "md",
  showClose = true, backdropDismiss, initialFocus, returnFocus, focusTitle = false, bodyLabel,
}: ModalProps) {
  const settings = useModalSettings();
  const phone = useMedia(PHONE);
  const reducedMotion = useMedia(REDUCED_MOTION);
  const animate = settings.animations && !reducedMotion;
  const layout = settings.layout === "auto" ? (phone ? "sheet" : "dialog") : settings.layout;

  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed");
  // Follow `open` during render: closing either animates out or ends at once.
  if (open && phase !== "open") setPhase("open");
  if (!open && phase === "open") setPhase(animate ? "closing" : "closed");

  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const layerRef = useRef<Layer | null>(null);
  const opened = useRef(false);
  const pressedBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  const askClose = useEffectEvent((reason: CloseReason) => onRequestClose(reason));
  const allowBackdrop = useEffectEvent(() => role !== "alertdialog" && (backdropDismiss ?? settings.backdropCloses));
  const firstFocus = useEffectEvent(() => (focusTitle ? titleRef.current : (initialFocus?.() ?? null)));
  const fallbackFocus = useEffectEvent(() => returnFocus?.() ?? null);
  const exited = useEffectEvent(() => onExited?.());

  // Register while open; leaving "open" returns focus (one frame later).
  useLayoutEffect(() => {
    if (phase === "open" && !layerRef.current && rootRef.current && dialogRef.current) {
      layerRef.current = pushLayer({
        title,
        root: rootRef.current,
        dialog: dialogRef.current,
        initialFocus: firstFocus,
        returnFocus: fallbackFocus,
        backdropDismiss: allowBackdrop,
        onRequestClose: askClose,
      });
      opened.current = true;
    } else if (phase !== "open" && layerRef.current) {
      popLayer(layerRef.current, { returnFocus: true });
      layerRef.current = null;
    }
    if (phase === "closed" && opened.current) {
      opened.current = false;
      exited();
    }
  }, [phase, title]);

  // Unmounted while open (navigation): release the page, leave focus alone.
  useEffect(
    () => () => {
      if (layerRef.current) popLayer(layerRef.current, { returnFocus: false });
      layerRef.current = null;
    },
    [],
  );

  // Exit animation fallback.
  useEffect(() => {
    if (phase !== "closing") return;
    const timer = setTimeout(() => setPhase("closed"), EXIT_TIMEOUT);
    return () => clearTimeout(timer);
  }, [phase]);

  function handleTransitionEnd(event: React.TransitionEvent) {
    if (phase === "closing" && event.target === dialogRef.current) setPhase("closed");
  }

  function handleBackdropDown(event: React.PointerEvent) {
    pressedBackdrop.current = event.button === 0 && event.target === event.currentTarget;
  }

  // Close only when the press started *and* ended on the backdrop, so a
  // text selection dragged out of the dialog doesn't dismiss it.
  function handleBackdropUp(event: React.PointerEvent) {
    const both = pressedBackdrop.current && event.target === event.currentTarget;
    pressedBackdrop.current = false;
    if (both && layerRef.current) requestClose(layerRef.current, "backdrop");
  }

  function handleCloseButton() {
    if (layerRef.current) requestClose(layerRef.current, "close-button");
  }

  if (phase === "closed" || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      data-state={phase}
      inert={phase === "closing"}
      className={cn("fixed inset-0 z-40 flex", ROOT[layout])}
    >
      <div
        aria-hidden
        onPointerDown={handleBackdropDown}
        onPointerUp={handleBackdropUp}
        className={cn(
          "absolute inset-0 touch-none bg-black/50 supports-backdrop-filter:backdrop-blur-[2px]",
          animate && "transition-opacity duration-180 starting:opacity-0",
          phase === "closing" && "opacity-0 duration-120",
        )}
      />
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-state={phase}
        onTransitionEnd={handleTransitionEnd}
        className={cn(
          "relative flex flex-col border bg-popover text-sm text-popover-foreground shadow-lg outline-none",
          SIZES[size],
          PANEL[layout],
          animate
            ? "transition-[opacity,transform,translate,scale] duration-180 ease-out data-[state=closing]:duration-120 data-[state=closing]:ease-in"
            : "transition-none",
        )}
      >
        <header className="flex items-start gap-3 px-5 pt-5 pb-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-lg font-semibold outline-none">
              {title}
            </h2>
            {description ? (
              <div id={descriptionId} className="text-foreground/75">
                {description}
              </div>
            ) : null}
          </div>
          {showClose ? (
            <Button variant="ghost" size="icon-sm" aria-label="Close" data-modal-close onClick={handleCloseButton} className="-mt-1 -mr-2">
              <X aria-hidden />
            </Button>
          ) : null}
        </header>
        {children ? (
          <div
            role={bodyLabel ? "region" : undefined}
            aria-label={bodyLabel}
            tabIndex={bodyLabel ? 0 : undefined}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
          >
            {children}
          </div>
        ) : null}
        {footer ? (
          <footer className={cn("flex gap-2 border-t px-5 py-4", FOOTER[layout])}>{footer}</footer>
        ) : null}
      </div>
    </div>,
    getModalRoot(),
  );
}
