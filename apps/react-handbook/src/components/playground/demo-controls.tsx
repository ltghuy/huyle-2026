import { SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

export function DemoControls({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="demo-controls-heading"
      className={cn("rounded-xl border bg-card p-4", className)}
    >
      <h2
        id="demo-controls-heading"
        className="mb-3 flex items-center gap-2 text-sm font-medium"
      >
        <SlidersHorizontal aria-hidden className="size-4 text-muted-foreground" />
        Demo controls
      </h2>
      <div className="flex flex-wrap items-end gap-4">{children}</div>
    </section>
  );
}
