"use client";

import { TriangleAlert } from "lucide-react";
import { catchError, type ErrorInfo } from "next/error";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function StageFallback(_props: object, { error, retry }: ErrorInfo) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg bg-destructive/5 p-4"
    >
      <p className="flex items-center gap-2 font-medium text-destructive">
        <TriangleAlert aria-hidden className="size-4" />
        The demo crashed
      </p>
      <p className="font-mono text-xs break-all text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <Button variant="outline" size="sm" onClick={() => retry()}>
        Retry demo
      </Button>
    </div>
  );
}

const StageBoundary = catchError(StageFallback);

export function DemoStage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label="Live demo"
      className={cn("min-w-0 rounded-xl border bg-background p-4 md:p-6", className)}
    >
      <StageBoundary>{children}</StageBoundary>
    </section>
  );
}
