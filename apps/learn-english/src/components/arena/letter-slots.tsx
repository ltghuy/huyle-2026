import { cn } from "@/lib/utils";
import { Tile } from "./tile";

const LETTER = /[\p{L}\p{N}]/u;

export interface Slot {
  /** A letter slot, or a fixed mark of the word (space, hyphen, apostrophe). */
  kind: "letter" | "gap" | "mark";
  char: string;
}

/**
 * The mask's slots filled with what the learner typed, letters in order: "___-_____" and "icecr"
 * give "ice-cr____". Marks in the mask stay; marks the learner typed are skipped; extra letters
 * don't show.
 */
export function fillSlots(mask: string, typed: string): Slot[] {
  const letters = [...typed].filter((char) => LETTER.test(char));
  let next = 0;
  return [...mask].map((char): Slot => {
    if (char === "_") return { kind: "letter", char: letters[next++] ?? "" };
    return { kind: char === " " ? "gap" : "mark", char };
  });
}

/** Splits slots into words at the gaps, so a phrase wraps between words, never inside one. */
export function slotWords<T extends { kind: string }>(slots: T[]): T[][] {
  const words: T[][] = [[]];
  for (const slot of slots) {
    if (slot.kind === "gap") words.push([]);
    else words[words.length - 1].push(slot);
  }
  return words.filter((word) => word.length > 0);
}

/**
 * A row of tiles for one word. A single word stays on one line and its tiles shrink to fit a
 * phone (up to the normal 44 px); in a phrase each word keeps small fixed tiles and the words wrap.
 */
export function TileWord({ children, single }: { children: React.ReactNode; single: boolean }) {
  return <span className={cn("flex gap-1 sm:gap-1.5", single ? "w-full max-w-full justify-center" : "shrink-0")}>{children}</span>;
}

export function wordTileClass(single: boolean): string {
  return single ? "aspect-square h-auto w-auto min-w-0 max-w-11 flex-1 basis-0 text-[clamp(0.8rem,4.5vw,1.25rem)]" : "";
}

/** One empty tile per letter of the answer, filling as the learner types (the word-puzzle moment). Decorative: the input has the label. */
export function LetterSlots({ mask, typed }: { mask: string; typed: string }) {
  const words = slotWords(fillSlots(mask, typed));
  const single = words.length === 1;
  return (
    <div aria-hidden className="flex w-full flex-wrap justify-center gap-x-3 gap-y-2" lang="en">
      {words.map((word, w) => (
        <TileWord key={w} single={single}>
          {word.map((slot, i) =>
            slot.kind === "mark" ? (
              <span key={i} className="flex items-end pb-1 text-xl font-bold text-muted-foreground">
                {slot.char}
              </span>
            ) : (
              <Tile key={i} size={single ? "md" : "sm"} state={slot.char ? "filled" : "empty"} className={cn("lowercase", wordTileClass(single))}>
                {slot.char || "·"}
              </Tile>
            ),
          )}
        </TileWord>
      ))}
    </div>
  );
}
