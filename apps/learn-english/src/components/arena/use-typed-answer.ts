"use client";

import { useEffect, useRef, useState } from "react";

const SHAKE: Keyframe[] = [{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }];

interface Options {
  /** The room's wrong-answer counter when the last wrong one was yours (0 otherwise); a rise means your last try was wrong. */
  wrongCount: number;
  onSend: (text: string) => void;
  onTyping: () => void;
}

/**
 * A typed answer box: sends on Enter, tells the rival you're typing, and after a wrong try shakes,
 * says so and selects the text so the next try is quick (design "Fast and forgiving").
 */
export function useTypedAnswer({ wrongCount, onSend, onTyping }: Options) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const seenWrong = useRef(wrongCount);
  /** Bumped on each wrong try (a new key replays the shake); 0 once the learner types again. */
  const [wrongTry, setWrongTry] = useState(0);

  // Focus the box as the question opens.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    // The room's counter only rises; a lower value is the rival's turn showing, not a try of yours.
    if (wrongCount <= seenWrong.current) return;
    seenWrong.current = wrongCount;
    const input = inputRef.current;
    input?.select();
    // Shake the box without remounting it, so focus and the selection stay.
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      input?.closest("[data-shake]")?.animate?.(SHAKE, { duration: 250, easing: "ease-in-out" });
    }
    const frame = requestAnimationFrame(() => setWrongTry(wrongCount));
    return () => cancelAnimationFrame(frame);
  }, [wrongCount]);

  function change(next: string) {
    setText(next);
    setWrongTry(0);
    if (next.trim()) onTyping();
  }

  function send() {
    if (text.trim()) onSend(text);
  }

  return { text, change, send, inputRef, wrongTry };
}
