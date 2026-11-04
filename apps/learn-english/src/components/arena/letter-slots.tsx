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

/** One empty tile per letter of the answer, filling as the learner types (the word-puzzle moment). Decorative: the input has the label. */
export function LetterSlots({ mask, typed }: { mask: string; typed: string }) {
  const slots = fillSlots(mask, typed);
  const long = slots.length > 10;
  return (
    <div aria-hidden className="flex flex-wrap justify-center gap-1 sm:gap-1.5" lang="en">
      {slots.map((slot, i) =>
        slot.kind === "gap" ? (
          <span key={i} className="w-3" />
        ) : slot.kind === "mark" ? (
          <span key={i} className="flex items-end pb-1 text-xl font-bold text-muted-foreground">
            {slot.char}
          </span>
        ) : (
          <Tile key={i} size={long ? "sm" : "md"} state={slot.char ? "filled" : "empty"} className="lowercase">
            {slot.char || "·"}
          </Tile>
        ),
      )}
    </div>
  );
}
