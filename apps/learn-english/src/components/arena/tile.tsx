import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// The Arena's signature piece (feature 023, design "Tiles are the signature"):
// a chunky, pressable tile for the room code, answer options, the letter slots
// of "Nhớ lại từ" and the revealed answer. Theme tokens only, so every accent
// and dark mode work. Use `tileVariants` on a <button> for options.
export const tileVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center rounded-lg border-2 border-b-4 font-bold tabular-nums transition-[transform,background-color,border-color] duration-150",
  {
    variants: {
      state: {
        idle: "border-border bg-card text-foreground",
        /** A letter typed into a slot, or the option being chosen. */
        filled: "border-primary/50 bg-primary/10 text-foreground",
        correct: "border-success bg-success/15 text-foreground",
        wrong: "border-destructive bg-destructive/10 text-foreground animate-tile-shake",
        /** An option you can no longer pick (after a wrong pick, or once the question is over). */
        locked: "border-border bg-muted text-muted-foreground",
        /** An empty letter slot. */
        empty: "border-dashed border-border bg-transparent text-transparent",
      },
      size: {
        sm: "size-8 text-base",
        md: "size-11 text-xl",
        lg: "size-12 text-2xl sm:size-14 sm:text-3xl",
        /** Full-width answer option. */
        option: "min-h-14 w-full justify-start gap-3 px-4 py-3 text-left text-lg font-semibold",
      },
      interactive: {
        true: "cursor-pointer hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0.5 disabled:cursor-default disabled:hover:bg-[inherit] disabled:active:translate-y-0",
        false: "",
      },
      /** Flips in when it appears (the reveal); a blink under reduced motion. */
      flip: { true: "animate-tile-flip", false: "" },
    },
    defaultVariants: { state: "idle", size: "md", interactive: false, flip: false },
  },
);

export type TileVariants = VariantProps<typeof tileVariants>;

export function Tile({ className, state, size, interactive, flip, ...props }: React.ComponentProps<"span"> & TileVariants) {
  return <span data-slot="tile" data-state={state ?? "idle"} className={cn(tileVariants({ state, size, interactive, flip }), className)} {...props} />;
}
