"use client";

import {
  CheckCircle2,
  Info,
  Loader2,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { toaster, type Toast, type ToastType } from "./toast-store";

const TYPE_STYLES: Record<
  ToastType,
  { label: string; icon: typeof Info; accent: string }
> = {
  success: { label: "Success", icon: CheckCircle2, accent: "text-success border-l-success" },
  error: { label: "Error", icon: XCircle, accent: "text-destructive border-l-destructive" },
  info: { label: "Info", icon: Info, accent: "text-info border-l-info" },
  warning: { label: "Warning", icon: TriangleAlert, accent: "text-warning border-l-warning" },
  loading: { label: "In progress", icon: Loader2, accent: "text-muted-foreground border-l-border" },
};

export const ToastItem = memo(function ToastItem({
  item,
  edge,
  paused,
  onEscape,
}: {
  item: Toast;
  edge: "top" | "bottom";
  paused: boolean;
  onEscape: (id: string) => void;
}) {
  const style = TYPE_STYLES[item.type];
  const Icon = style.icon;
  const titleId = `${item.id}-title`;
  const exiting = item.phase === "exiting";

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    onEscape(item.id);
  }

  function handleAction() {
    void toaster.runAction(item.id);
  }

  return (
    <li
      data-phase={item.phase}
      className={cn(
        "grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-200 ease-out",
        "data-[phase=exiting]:grid-rows-[0fr] data-[phase=exiting]:opacity-0 data-[phase=exiting]:duration-[130ms] data-[phase=exiting]:ease-in",
      )}
    >
      <div className={cn("min-h-0", exiting && "overflow-hidden")}>
        <div className="py-1">
          <div
            role="group"
            tabIndex={exiting ? -1 : 0}
            data-toast-id={item.id}
            aria-labelledby={titleId}
            onKeyDown={handleKeyDown}
            className={cn(
              "relative flex items-start gap-3 overflow-hidden rounded-lg border border-l-4 bg-popover p-3 pr-2 text-popover-foreground shadow-lg outline-none",
              "transition-[translate,opacity] duration-200 ease-out starting:opacity-0",
              edge === "bottom" ? "starting:translate-y-3" : "starting:-translate-y-3",
              "focus-visible:ring-3 focus-visible:ring-ring/60",
              style.accent,
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "mt-0.5 size-4 shrink-0",
                item.type === "loading" && "animate-spin motion-reduce:animate-none",
              )}
            />
            <div className="min-w-0 flex-1 text-foreground">
              <p id={titleId} className="text-sm font-medium break-words">
                <span className="sr-only">{style.label}: </span>
                {item.title}
                {item.count > 1 ? (
                  <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground tabular-nums">
                    <span aria-hidden>×{item.count}</span>
                    <span className="sr-only">, {item.count} times</span>
                  </span>
                ) : null}
              </p>
              {item.description ? (
                <p className="mt-0.5 text-sm break-words text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
              {item.action ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={handleAction}
                >
                  {item.action.label}
                </Button>
              ) : null}
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Dismiss notification"
              className="shrink-0 text-muted-foreground"
              onClick={() => onEscape(item.id)}
            >
              <X aria-hidden />
            </Button>
            {item.duration !== null && !exiting ? (
              <ProgressBar
                key={item.version}
                duration={item.duration}
                remaining={item.remaining ?? item.duration}
                paused={paused}
              />
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
});

/** Remaining-time bar driven by the Web Animations API (no per-frame JS). */
function ProgressBar({
  duration,
  remaining,
  paused,
}: {
  duration: number;
  remaining: number;
  paused: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  // Elapsed time when this bar mounted; later pauses are handled by play/pause.
  const [startOffset] = useState(() => duration - remaining);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anim = el.animate(
      [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
      { duration, fill: "forwards", easing: "linear" },
    );
    anim.currentTime = startOffset;
    animation.current = anim;
    return () => anim.cancel();
  }, [duration, startOffset]);

  useEffect(() => {
    const anim = animation.current;
    if (!anim) return;
    if (paused) anim.pause();
    else anim.play();
  }, [paused]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-current opacity-40 motion-reduce:hidden"
    />
  );
}
