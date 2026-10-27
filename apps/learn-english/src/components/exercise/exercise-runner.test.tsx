import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { buildMcq } from "@/learning/exercises/mcq";
import { buildMissingLetters } from "@/learning/exercises/missing-letters";
import { buildListeningTyping } from "@/learning/exercises/listening";
import { buildRecall } from "@/learning/exercises/recall";
import { word } from "@/learning/exercises/fixtures";
import { ExerciseRunner, type RunnerStep } from "./exercise-runner";

const target = word("apple", { meaningsVi: ["quả táo"], audio: "a".repeat(64) });
const pool = [word("cat", { meaningsVi: ["con mèo"] }), word("table", { meaningsVi: ["cái bàn"] }), word("house", { meaningsVi: ["ngôi nhà"] })];
const mcq = buildMcq({ target, pool, direction: "en-vi" }, 1)!;

function setup(steps: RunnerStep[]) {
  const onOutcome = vi.fn();
  const onFinish = vi.fn();
  const onExit = vi.fn();
  render(<ExerciseRunner steps={steps} onOutcome={onOutcome} onFinish={onFinish} onExit={onExit} />);
  return { onOutcome, onFinish, onExit };
}

afterEach(() => vi.unstubAllGlobals());

describe("ExerciseRunner", () => {
  it("checks a multiple-choice answer chosen with the keyboard and reports the outcome", async () => {
    const { onOutcome, onFinish } = setup([{ key: "s1", type: "exercise", instance: mcq, seed: 1 }]);
    const check = screen.getByRole("button", { name: "Kiểm tra" });
    expect(check).toBeDisabled();

    fireEvent.keyDown(window, { key: String(mcq.answerIndex + 1) });
    expect(check).toBeEnabled();
    await act(async () => fireEvent.click(check));

    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
    expect(onOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ key: "s1" }),
      expect.objectContaining({ itemId: "word:apple", exercise: "mcq", result: expect.objectContaining({ correct: true }), ms: expect.any(Number) }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(onFinish).toHaveBeenCalledWith({ correct: 1, total: 1 });
  });

  it("shows the right answer after a wrong choice, with an icon and words", async () => {
    setup([{ key: "s1", type: "exercise", instance: mcq, seed: 1 }]);
    const wrong = (mcq.answerIndex + 1) % mcq.options.length;
    fireEvent.click(screen.getAllByRole("radio")[wrong]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();
    expect(screen.getByText(mcq.options[mcq.answerIndex].text, { selector: "span.font-semibold" })).toBeInTheDocument();
  });

  it("fills missing letters by tapping tiles", async () => {
    const instance = buildMissingLetters({ target: word("homework") }, 7);
    const { onOutcome } = setup([{ key: "m", type: "exercise", instance, seed: 7 }]);
    for (const letter of instance.answer) {
      const tile = screen.getAllByRole("button", { name: letter }).find((button) => !button.hasAttribute("disabled"));
      fireEvent.click(tile!);
    }
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1].result.correct).toBe(true);
  });

  it("moves past a study card without recording an outcome", () => {
    const { onOutcome, onFinish } = setup([{ key: "st", type: "study", item: target, examples: [] }]);
    expect(screen.getByRole("heading", { name: "apple" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(onOutcome).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledWith({ correct: 0, total: 0 });
  });

  it("swaps a listening exercise for recall when the audio can't play", async () => {
    vi.stubGlobal(
      "Audio",
      class {
        currentTime = 0;
        play() {
          return Promise.reject(new Error("offline"));
        }
      },
    );
    setup([{ key: "l", type: "exercise", instance: buildListeningTyping({ target }), seed: 1, fallback: buildRecall({ target }) }]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Nghe:/ })));
    expect(screen.getByText("Gõ từ tiếng Anh có nghĩa là")).toBeInTheDocument();
  });

  it("asks before leaving once the learner has started", async () => {
    const { onExit } = setup([
      { key: "st", type: "study", item: target, examples: [] },
      { key: "s1", type: "exercise", instance: mcq, seed: 1 },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    fireEvent.click(screen.getByRole("button", { name: "Thoát" }));
    expect(await screen.findByText("Dừng bài ở đây?")).toBeInTheDocument();
    expect(onExit).not.toHaveBeenCalled();
  });
});
