"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PracticeError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6"
    >
      <p className="flex items-center gap-2 font-medium text-destructive">
        <TriangleAlert aria-hidden className="size-4" />
        This practice failed to load
      </p>
      <p className="font-mono text-xs break-all text-muted-foreground">
        {error.digest ? `Error ${error.digest}` : error.message}
      </p>
      <Button variant="outline" size="sm" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
