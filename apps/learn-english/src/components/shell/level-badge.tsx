import type { Level } from "@/learning/types";
import { cn } from "@/lib/utils";

// Full class names so Tailwind sees them; one theme hue per level (feature 020).
const LEVEL_CLASSES: Record<Level, string> = {
  A1: "bg-level-a1/15 text-level-a1",
  A2: "bg-level-a2/15 text-level-a2",
  B1: "bg-level-b1/15 text-level-b1",
  B2: "bg-level-b2/15 text-level-b2",
  C1: "bg-level-c1/15 text-level-c1",
};

/** A CEFR level as a coloured pill, the same hue on every page. */
export function LevelBadge({ level, size = "sm", className }: { level: Level; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      lang="en"
      className={cn(
        "inline-flex items-center rounded-full font-semibold tabular-nums",
        size === "md" ? "h-7 px-2.5 text-sm" : "h-6 px-2 text-xs",
        LEVEL_CLASSES[level],
        className,
      )}
    >
      {level}
    </span>
  );
}
