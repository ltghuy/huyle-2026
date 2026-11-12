import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import type { DictationInstance } from "@/learning/exercises/dictation";
import type { GradeResult } from "@/learning/exercises/types";
import { DictationView } from "./dictation-exercise";

const instance: DictationInstance = {
  kind: "dictation",
  sentenceId: "sentence:home-1",
  audio: "a".repeat(64),
  en: "The kitchen is big.",
  vi: "Nhà bếp rộng.",
  wordCount: 4,
};

let play: ReturnType<typeof vi.fn>;

beforeEach(() => {
  play = vi.fn(() => Promise.resolve());
  vi.stubGlobal(
    "Audio",
    class {
      currentTime = 0;
      playbackRate = 1;
      play = play;
      pause = vi.fn();
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
    },
  );
});

afterEach(() => vi.unstubAllGlobals());

function setup(result: "none" | "checked" = "none") {
  const graded: GradeResult | null = result === "checked" ? { correct: true, expected: instance.en } : null;
  render(<DictationView instance={instance} answer={null} onAnswer={() => {}} result={graded} seed={1} />);
  play.mockClear(); // the clip plays once on open
}

function tapShift(target: Element | Window = window, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(target, { key: "Shift", shiftKey: true, ...init });
  fireEvent.keyUp(target, { key: "Shift", ...init });
}

describe("DictationView Shift replay (quick 068)", () => {
  it("replays the sentence when Shift is tapped on its own, also from the answer box", () => {
    setup();
    tapShift();
    expect(play).toHaveBeenCalledTimes(1);
    tapShift(screen.getByRole("textbox", { name: "Câu bạn nghe được" }));
    expect(play).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: /Nghe lại/ })).toHaveAttribute("aria-keyshortcuts", "Shift");
  });

  it("doesn't replay while Shift types a capital, with another modifier, or on key repeat", () => {
    setup();
    const box = screen.getByRole("textbox", { name: "Câu bạn nghe được" });
    fireEvent.keyDown(box, { key: "Shift", shiftKey: true });
    fireEvent.keyDown(box, { key: "T", shiftKey: true });
    fireEvent.keyUp(box, { key: "T", shiftKey: true });
    fireEvent.keyUp(box, { key: "Shift" });
    tapShift(window, { ctrlKey: true });
    fireEvent.keyDown(window, { key: "Shift", shiftKey: true, repeat: true });
    fireEvent.keyUp(window, { key: "Shift" });
    expect(play).not.toHaveBeenCalled();
  });

  it("stops listening once the answer is checked", () => {
    setup("checked");
    tapShift();
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Nghe lại/ })).not.toHaveAttribute("aria-keyshortcuts");
  });
});
