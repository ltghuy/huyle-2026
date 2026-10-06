import { CheckCircle2, Clock } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatusBadge({
  built,
  className,
}: {
  built: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        built
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {built ? (
        <CheckCircle2 aria-hidden className="size-3" />
      ) : (
        <Clock aria-hidden className="size-3" />
      )}
      {built ? "Built" : "Coming soon"}
    </span>
  );
}
