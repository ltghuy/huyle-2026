import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { buildMcq } from "@/learning/exercises/mcq";
import { buildMissingLetters } from "@/learning/exercises/missing-letters";
import { buildListeningChoice, buildListeningTyping } from "@/learning/exercises/listening";
import { buildRecall } from "@/learning/exercises/recall";
import { word } from "@/learning/exercises/fixtures";
import { isSoundEnabled, playAnswerSound } from "@/lib/answer-sound";
import { ExerciseRunner, type RunnerStep } from "./exercise-runner";
import { CORRECT_FEEDBACK_MS } from "./feedback-panel";

vi.mock("@/lib/answer-sound", () => ({ playAnswerSound: vi.fn(), isSoundEnabled: vi.fn(() => true) }));

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.mocked(playAnswerSound).mockClear();
});

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
    const related = { cardIds: ["grammar:present-simple" as const], link: { href: "/grammar?topic=present-simple", label: "Thì hiện tại đơn" } };
    const { onOutcome } = setup([{ key: "c", type: "exercise", instance, seed: 1, related }]);
    fireEvent.click(screen.getAllByRole("radio")[(instance.answerIndex + 1) % 4]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1].related).toEqual(["grammar:present-simple"]);
    expect(screen.getByRole("link", { name: "Xem lại: Thì hiện tại đơn" })).toHaveAttribute("href", "/grammar?topic=present-simple");
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

  it("plays the right sound and hides \"Chính xác!\" after a moment", async () => {
    vi.useFakeTimers();
    setup([{ key: "s1", type: "exercise", instance: mcq, seed: 1 }]);
    fireEvent.keyDown(window, { key: String(mcq.answerIndex + 1) });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(playAnswerSound).toHaveBeenCalledWith(true);
    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(CORRECT_FEEDBACK_MS));
    expect(screen.queryByText("Chính xác!")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeInTheDocument();
  });

  it("plays the wrong sound and keeps the right answer on screen", async () => {
    vi.useFakeTimers();
    setup([{ key: "s1", type: "exercise", instance: mcq, seed: 1 }]);
    fireEvent.click(screen.getAllByRole("radio")[(mcq.answerIndex + 1) % mcq.options.length]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(playAnswerSound).toHaveBeenCalledWith(false);
    act(() => vi.advanceTimersByTime(CORRECT_FEEDBACK_MS * 2));
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();
  });

  it("shows the word, its IPA and meaning only after a listening answer is checked", async () => {
    const prince = word("prince", { ipa: "prɪns", meaningsVi: ["hoàng tử"], audio: "b".repeat(64) });
    const others = ["pretty", "pencil", "parent"].map((slug) => word(slug));
    const instance = buildListeningChoice({ target: prince, pool: others }, 1)!;
    setup([{ key: "l", type: "exercise", instance, seed: 1 }]);
    expect(screen.queryByText("hoàng tử")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("radio")[instance.answerIndex]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    const reveal = screen.getByRole("group", { name: "Nghĩa của từ" });
    expect(reveal).toHaveTextContent("prince");
    expect(reveal).toHaveTextContent("prɪns");
    expect(reveal).toHaveTextContent("hoàng tử");
  });

  describe("pronouncing the word after a right multiple-choice answer", () => {
    function stubAudio() {
      const play = vi.fn(() => Promise.resolve());
      const urls: string[] = [];
      vi.stubGlobal(
        "Audio",
        class {
          constructor(url: string) {
            urls.push(url);
          }
          play = play;
          pause = vi.fn();
        },
      );
      return { play, urls };
    }

    async function answer(right: boolean) {
      setup([{ key: "s1", type: "exercise", instance: mcq, seed: 1 }]);
      const index = right ? mcq.answerIndex : (mcq.answerIndex + 1) % mcq.options.length;
      fireEvent.click(screen.getAllByRole("radio")[index]);
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
      act(() => vi.advanceTimersByTime(1000));
    }

    it("plays the word's clip once, after the chime", async () => {
      vi.useFakeTimers();
      const { play, urls } = stubAudio();
      await answer(true);
      expect(urls).toEqual([expect.stringMatching(new RegExp(`/${mcq.audio}\\.mp3$`))]);
      expect(play).toHaveBeenCalledTimes(1);
    });

    it("also says the word after a right recall or missing-letters answer", async () => {
      vi.useFakeTimers();
      const { play, urls } = stubAudio();
      const recall = buildRecall({ target });
      setup([{ key: "r", type: "exercise", instance: recall, seed: 1 }]);
      fireEvent.change(screen.getByRole("textbox", { name: "Từ tiếng Anh" }), { target: { value: "apple" } });
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
      act(() => vi.advanceTimersByTime(1000));
      expect(play).toHaveBeenCalledTimes(1);

      cleanup();
      const homework = word("homework", { audio: "c".repeat(64) });
      const letters = buildMissingLetters({ target: homework }, 7);
      setup([{ key: "m", type: "exercise", instance: letters, seed: 7 }]);
      for (const letter of letters.answer) {
        fireEvent.click(screen.getAllByRole("button", { name: letter }).find((button) => !button.hasAttribute("disabled"))!);
      }
      await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
      act(() => vi.advanceTimersByTime(1000));
      expect(play).toHaveBeenCalledTimes(2);
      expect(urls[1]).toMatch(/\/c{64}\.mp3$/);
    });

    it("stays quiet after a wrong answer, and when answer sounds are off", async () => {
      vi.useFakeTimers();
      const { play } = stubAudio();
      await answer(false);
      expect(play).not.toHaveBeenCalled();

      cleanup();
      vi.mocked(isSoundEnabled).mockReturnValueOnce(false);
      await answer(true);
      expect(play).not.toHaveBeenCalled();
    });
  });
});
