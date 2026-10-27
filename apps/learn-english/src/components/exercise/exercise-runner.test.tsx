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

describe("sentence exercises", () => {
  it("accepts a word order built from tiles and shows the translation", async () => {
    const { buildWordOrder } = await import("@/learning/exercises/word-order");
    const { sentence } = await import("@/learning/exercises/fixtures");
    const item = sentence("s", { tokens: ["I", "like", "tea"], vi: "Tôi thích trà." });
    const instance = buildWordOrder({ sentence: item }, 3);
    const { onOutcome } = setup([{ key: "w", type: "exercise", instance, seed: 3 }]);
    for (const token of ["I", "like", "tea"]) fireEvent.click(screen.getByRole("button", { name: token }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1]).toMatchObject({ itemId: "sentence:s", exercise: "word-order", result: { correct: true } });
    expect(screen.getAllByText("Tôi thích trà.").length).toBeGreaterThan(0);
  });

  it("links the related grammar and reports cards to bring forward after a wrong answer", async () => {
    const { buildChooseSentence } = await import("@/learning/exercises/choose-sentence");
    const { sentence } = await import("@/learning/exercises/fixtures");
    const item = sentence("c", {
      tokens: ["She", "goes", "to", "school"],
      wrongVariants: [
        { en: "She go to school", explanationVi: "Thiếu -es." },
        { en: "She going to school", explanationVi: "Thiếu is." },
        { en: "She goes to the school", explanationVi: "Thừa the." },
      ],
    });
    const instance = buildChooseSentence({ sentence: item }, 1)!;
    const related = { cardIds: ["grammar:present-simple" as const], link: { href: "/ngu-phap?bai=present-simple", label: "Thì hiện tại đơn" } };
    const { onOutcome } = setup([{ key: "c", type: "exercise", instance, seed: 1, related }]);
    fireEvent.click(screen.getAllByRole("radio")[(instance.answerIndex + 1) % 4]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1].related).toEqual(["grammar:present-simple"]);
    expect(screen.getByRole("link", { name: "Xem lại: Thì hiện tại đơn" })).toHaveAttribute("href", "/ngu-phap?bai=present-simple");
  });

  it("self-checks free writing against the model answers", async () => {
    const instance = { kind: "writing" as const, writingId: "writing:a1-1", promptVi: "Viết về gia đình bạn.", modelAnswers: ["I have a small family."] };
    const { onOutcome } = setup([{ key: "wr", type: "exercise", instance, seed: 1 }]);
    fireEvent.change(screen.getByRole("textbox", { name: "Bài viết của bạn" }), { target: { value: "My family is small." } });
    fireEvent.click(screen.getByRole("button", { name: "Xem bài mẫu" }));
    expect(screen.getByText("I have a small family.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Mình viết đúng/ }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1]).toMatchObject({ exercise: "writing", result: { correct: true } });
  });
});

describe("finishing", () => {
  it("finishes only once, even when the last button is pressed twice", () => {
    const onFinish = vi.fn();
    render(<ExerciseRunner steps={[{ key: "st", type: "study", item: target, examples: [] }]} onOutcome={vi.fn()} onFinish={onFinish} onExit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(screen.getByRole("button", { name: "Đang lưu…" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Đang lưu…" }).closest("form")!);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
