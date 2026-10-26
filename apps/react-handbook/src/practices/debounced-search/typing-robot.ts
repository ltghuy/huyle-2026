// Types a phrase one character at a time at a steady rate, so races between
// keystrokes, the debounce delay and server latency are reproducible.

export const ROBOT_SPEEDS = [
  { value: 50, label: "Fast (50 ms per key)" },
  { value: 400, label: "Slow (400 ms per key)" },
] as const;

export const ROBOT_PHRASES = ["desk lamp", "café mug", "walnut standing desk", "wool rug"] as const;

/** Clears the box, then types `phrase`; returns a function that stops it. */
export function typePhrase(
  phrase: string,
  msPerChar: number,
  onType: (text: string) => void,
  onDone: () => void,
): () => void {
  let typed = 0;
  onType("");
  const timer = setInterval(() => {
    typed += 1;
    onType(phrase.slice(0, typed));
    if (typed >= phrase.length) {
      clearInterval(timer);
      onDone();
    }
  }, msPerChar);
  return () => clearInterval(timer);
}
