import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { buildMcq } from "@/learning/exercises/mcq";
import { buildMissingLetters } from "@/learning/exercises/missing-letters";
import { buildListeningChoice, buildListeningTyping } from "@/learning/exercises/listening";
import { buildRecall } from "@/learning/exercises/recall";
import { forms, word } from "@/learning/exercises/fixtures";
import { buildFormsGap, buildFormsListening, buildFormsTyping } from "@/learning/exercises/forms";
import { isSoundEnabled, playAnswerSound } from "@/lib/answer-sound";
import { AUTO_CONTINUE_MS, ExerciseRunner, type RunnerStep } from "./exercise-runner";
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

describe("moving on by itself after a checked answer (quick 056)", () => {
  const other = buildMcq({ target: pool[0], pool: [target, ...pool.slice(1)], direction: "en-vi" }, 2)!;
  const steps: RunnerStep[] = [
    { key: "a", type: "exercise", instance: mcq, seed: 1 },
    { key: "b", type: "exercise", instance: other, seed: 2 },
  ];

  async function check(correct: boolean) {
    const choice = correct ? mcq.answerIndex : (mcq.answerIndex + 1) % mcq.options.length;
    fireEvent.click(screen.getAllByRole("radio")[choice]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
  }

  it("moves to the next question 3 seconds after a right answer", async () => {
    vi.useFakeTimers();
    setup(steps);
    await check(true);
    act(() => vi.advanceTimersByTime(AUTO_CONTINUE_MS - 1));
    expect(screen.getByText("1/2")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kiểm tra" })).toBeDisabled();
  });

  it("finishes by itself after a right answer on the last question", async () => {
    vi.useFakeTimers();
    const { onFinish } = setup([steps[0]]);
    await check(true);
    act(() => vi.advanceTimersByTime(AUTO_CONTINUE_MS));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith({ correct: 1, total: 1 });
  });

  it("also moves on 3 seconds after a wrong answer, recording it", async () => {
    vi.useFakeTimers();
    const { onOutcome } = setup(steps);
    await check(false);
    act(() => vi.advanceTimersByTime(AUTO_CONTINUE_MS - 1));
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(1));
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(onOutcome).toHaveBeenCalledWith(expect.objectContaining({ key: "a" }), expect.objectContaining({ result: expect.objectContaining({ correct: false }) }));
  });

  it("waits on a study card", () => {
    vi.useFakeTimers();
    setup([{ key: "st", type: "study", item: target, examples: [] }, steps[0]]);
    act(() => vi.advanceTimersByTime(AUTO_CONTINUE_MS * 3));
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("waits while the leave dialog is open", async () => {
    vi.useFakeTimers();
    setup(steps);
    await check(true);
    fireEvent.click(screen.getByRole("button", { name: "Thoát" }));
    act(() => vi.advanceTimersByTime(AUTO_CONTINUE_MS * 2));
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });
});

describe("retrying wrong answers (feature 006)", () => {
  const other = buildMcq({ target: pool[0], pool: [target, ...pool.slice(1)], direction: "en-vi" }, 2)!;
  const steps: RunnerStep[] = [
    { key: "a", type: "exercise", instance: mcq, seed: 1 },
    { key: "b", type: "exercise", instance: other, seed: 2 },
  ];

  function retrySetup(retryWrong = true) {
    const onOutcome = vi.fn();
    const onFinish = vi.fn();
    render(<ExerciseRunner steps={steps} retryWrong={retryWrong} onOutcome={onOutcome} onFinish={onFinish} onExit={vi.fn()} />);
    return { onOutcome, onFinish };
  }

  async function answer(instance: typeof mcq, correct: boolean) {
    const choice = correct ? instance.answerIndex : (instance.answerIndex + 1) % instance.options.length;
    fireEvent.click(screen.getAllByRole("radio")[choice]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  }

  it("brings back only the wrong answers, round after round, until all are right (AC-001 to AC-005)", async () => {
    const { onOutcome, onFinish } = retrySetup();
    await answer(mcq, false);
    await answer(other, true);

    expect(onFinish).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Còn 1 câu chưa đúng" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Làm lại câu sai" }));
    expect(screen.getByText("Làm lại câu sai")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();

    await answer(mcq, false);
    expect(screen.getByRole("heading", { name: "Còn 1 câu chưa đúng" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Làm lại câu sai" }));
    await answer(mcq, true);

    // First try only: 1 of 2, one corrected; retries were never recorded (AC-006, AC-007).
    expect(onFinish).toHaveBeenCalledWith({ correct: 1, total: 2, corrected: 1 });
    expect(onOutcome).toHaveBeenCalledTimes(2);
  });

  it("finishes at once when every first answer was right", async () => {
    const { onFinish } = retrySetup();
    await answer(mcq, true);
    await answer(other, true);
    expect(onFinish).toHaveBeenCalledWith({ correct: 2, total: 2 });
  });

  it("never retries when the caller doesn't ask for it (daily lesson, Ôn tập)", async () => {
    const { onFinish } = retrySetup(false);
    await answer(mcq, false);
    await answer(other, true);
    expect(onFinish).toHaveBeenCalledWith({ correct: 1, total: 2 });
  });

  it("asks before leaving during a retry", async () => {
    retrySetup();
    await answer(mcq, false);
    await answer(other, true);
    fireEvent.click(screen.getByRole("button", { name: "Làm lại câu sai" }));
    fireEvent.click(screen.getByRole("button", { name: "Thoát" }));
    expect(await screen.findByText("Dừng bài ở đây?")).toBeInTheDocument();
  });
});

describe("sentence exercises", () => {
  it("accepts a word order built from tiles and shows the translation", async () => {
    const { buildWordOrder } = await import("@/learning/exercises/word-order");
    const { sentence } = await import("@/learning/exercises/fixtures");
    const item = sentence("s", { tokens: ["I", "like", "tea"], vi: "Tôi thích trà." });
    const instance = buildWordOrder({ sentence: item, distractorPool: ["coffee", "milk"] }, 3);
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

describe("verb forms exercises (feature 008)", () => {
  const go = word("go", { pos: "verb", meaningsVi: ["đi"] });
  const goForms = forms("go", ["went"], ["gone"], { audio: "c".repeat(64) });

  it("types the past form and reveals all three forms", async () => {
    const { onOutcome } = setup([{ key: "t", type: "exercise", instance: buildFormsTyping({ forms: goForms, word: go, form: "past" }, 0), seed: 0 }]);
    expect(screen.getByText("Gõ dạng quá khứ (V2) của động từ")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Dạng quá khứ (V2)"), { target: { value: "went" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(screen.getByRole("group", { name: "Ba dạng của động từ" })).toHaveTextContent("go – went – gone");
    expect(onOutcome.mock.calls[0][1]).toMatchObject({ itemId: "forms:go", exercise: "forms-typing", result: { correct: true } });
  });

  it("chooses the form for a sentence", async () => {
    const instance = buildFormsGap({ forms: goForms, word: go }, 0)!;
    const { onOutcome } = setup([{ key: "g", type: "exercise", instance, seed: 0 }]);
    expect(screen.getByText("Yesterday she ___ home.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("radio")[instance.answerIndex]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1]).toMatchObject({ exercise: "forms-gap", result: { correct: true, expected: "went" } });
  });

  it("listens to the three forms and chooses the spelling", async () => {
    const instance = buildFormsListening({ forms: goForms, word: go }, 1)!;
    const { onOutcome } = setup([{ key: "l", type: "exercise", instance, seed: 1 }]);
    expect(screen.getByRole("button", { name: /ba dạng cần nghe/ })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("radio")[(instance.answerIndex + 1) % 4]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1]).toMatchObject({ exercise: "forms-listening", result: { correct: false, expected: "go, went, gone" } });
  });
});

describe("dictation (feature 010)", () => {
  /** A fake clip that remembers how it was played and can fail to load. */
  class FakeAudio {
    static last: FakeAudio | null = null;
    static plays: number[] = [];
    currentTime = 0;
    playbackRate = 1;
    listeners: Record<string, (() => void)[]> = {};
    constructor() {
      FakeAudio.last = this;
    }
    addEventListener(type: string, listener: () => void) {
      (this.listeners[type] ??= []).push(listener);
    }
    removeEventListener() {}
    pause() {}
    play() {
      FakeAudio.plays.push(this.playbackRate);
      return Promise.resolve();
    }
    fail() {
      for (const listener of this.listeners.error ?? []) listener();
    }
  }

  async function dictationStep() {
    const { buildDictation } = await import("@/learning/exercises/dictation");
    const { buildWordOrder } = await import("@/learning/exercises/word-order");
    const { sentence } = await import("@/learning/exercises/fixtures");
    const item = sentence("s", { tokens: ["She", "works", "at", "a", "hospital."], vi: "Cô ấy làm việc ở bệnh viện.", audio: "c".repeat(64) });
    return { key: "d", type: "exercise" as const, instance: buildDictation({ sentence: item })!, seed: 1, fallback: buildWordOrder({ sentence: item, distractorPool: [] }, 1) };
  }

  function typeSentence(text: string) {
    fireEvent.change(screen.getByRole("textbox", { name: "Câu bạn nghe được" }), { target: { value: text } });
  }

  afterEach(() => {
    FakeAudio.last = null;
    FakeAudio.plays = [];
  });

  it("plays the sentence on open, hides its text, and replays at normal or slow speed (AC-001 to AC-003)", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    setup([await dictationStep()]);
    expect(FakeAudio.plays).toEqual([1]);
    expect(screen.queryByText("She works at a hospital.")).not.toBeInTheDocument();
    expect(screen.queryByText("Cô ấy làm việc ở bệnh viện.")).not.toBeInTheDocument();
    expect(screen.getByText("Câu có 5 từ")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nghe chậm" }));
    fireEvent.click(screen.getByRole("button", { name: "Nghe lại" }));
    expect(FakeAudio.plays).toEqual([1, 0.75, 1]);

    typeSentence("she works at");
    expect(screen.getByText("Câu có 5 từ, bạn đã gõ 3 từ")).toBeInTheDocument();
  });

  it("accepts a forgiving answer and shows the sentence and meaning (AC-004, AC-005, AC-010)", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const { onOutcome } = setup([await dictationStep()]);
    typeSentence("SHE works at a hospital");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1]).toMatchObject({ itemId: "sentence:s", exercise: "dictation", result: { correct: true } });
    expect(screen.getByText("Cô ấy làm việc ở bệnh viện.")).toBeInTheDocument();
  });

  it("marks each word after a wrong answer, with a Vietnamese summary (AC-008, AC-009)", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    setup([await dictationStep()]);
    typeSentence("she work at hospital");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(screen.getByRole("group", { name: "Đúng 3/5 từ, thiếu 1 từ, sai 1 từ" })).toBeInTheDocument();
    expect(screen.getByText("thiếu")).toBeInTheDocument();
    expect(screen.getByText("work")).toBeInTheDocument();
  });

  it("shows the meaning as a hint and records the answer as hinted (AC-015, AC-016)", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const { onOutcome } = setup([await dictationStep()]);
    typeSentence("she works at a hospital");
    fireEvent.click(screen.getByRole("button", { name: "Gợi ý" }));
    expect(screen.getByText("Cô ấy làm việc ở bệnh viện.")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1]).toMatchObject({ result: { correct: true, hinted: true } });
  });

  it("swaps to putting the words in order when the clip can't load", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    setup([await dictationStep()]);
    act(() => FakeAudio.last!.fail());
    expect(screen.getByText("Sắp xếp các từ thành câu đúng")).toBeInTheDocument();
  });
});

describe("find the error (feature 011)", () => {
  async function findErrorStep() {
    const { buildFindError } = await import("@/learning/exercises/find-error");
    const { sentence } = await import("@/learning/exercises/fixtures");
    const item = sentence("ability", {
      tokens: ["She", "has", "the", "ability", "to", "learn", "languages", "fast."],
      vi: "Cô ấy có khả năng học ngôn ngữ nhanh.",
      wrongVariants: [{ en: "She has the ability to learning languages fast.", explanationVi: "Sau \"to\" dùng động từ nguyên mẫu." }],
    });
    const instance = buildFindError({ sentence: item }, 5)!;
    return { step: { key: "f", type: "exercise" as const, instance, seed: 5 }, instance };
  }

  it("letters four underlined parts and their choices A to D (AC-001, AC-004)", async () => {
    const { step, instance } = await findErrorStep();
    setup([step]);
    expect(screen.getByText("Chọn phần sai trong câu")).toBeInTheDocument();
    const choices = screen.getAllByRole("radio");
    expect(choices).toHaveLength(4);
    expect(choices.map((choice) => choice.textContent)).toEqual(instance.parts.map((part, i) => `${"ABCD"[i]}${part}`));
    fireEvent.keyDown(window, { key: "c" });
    expect(choices[2]).toHaveAttribute("aria-checked", "true");
  });

  it("explains the error and its replacement after a right pick (AC-005, AC-006)", async () => {
    const { step, instance } = await findErrorStep();
    const { onOutcome } = setup([step]);
    fireEvent.keyDown(window, { key: "ABCD"[instance.answerIndex] });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(onOutcome.mock.calls[0][1]).toMatchObject({ itemId: "sentence:ability", exercise: "find-error", result: { correct: true } });
    const correction = screen.getByRole("group", { name: "Giải thích lỗi sai" });
    expect(correction).toHaveTextContent("learning");
    expect(correction).toHaveTextContent("learn");
    expect(correction).toHaveTextContent("Sau \"to\" dùng động từ nguyên mẫu.");
    expect(screen.getByText("Cô ấy có khả năng học ngôn ngữ nhanh.")).toBeInTheDocument();
  });

  it("says which part was picked and which was wrong after a wrong pick (AC-007, AC-008)", async () => {
    const { step, instance } = await findErrorStep();
    setup([step]);
    const wrong = (instance.answerIndex + 1) % 4;
    fireEvent.click(screen.getAllByRole("radio")[wrong]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Giải thích lỗi sai" })).toHaveTextContent(`Bạn chọn (${"ABCD"[wrong]}) ${instance.parts[wrong]}, phần này đúng.`);
    expect(screen.getByText(", phần sai")).toBeInTheDocument();
    expect(screen.getByText(", bạn đã chọn")).toBeInTheDocument();
  });
});

describe("translate (feature 016)", () => {
  async function translateStep(key = "t") {
    const { buildTranslate } = await import("@/learning/exercises/translate");
    const { sentence } = await import("@/learning/exercises/fixtures");
    const item = sentence("sea", { tokens: ["Close", "your", "eyes", "and", "imagine", "the", "sea."], vi: "Nhắm mắt lại và tưởng tượng biển cả.", grammarSlug: "imperative" });
    return {
      key,
      type: "exercise" as const,
      instance: buildTranslate({ sentence: item })!,
      seed: 1,
      related: { cardIds: ["grammar:imperative" as const], link: { href: "/grammar?topic=imperative", label: "imperative" } },
    };
  }

  async function answer(text: string) {
    fireEvent.change(screen.getByRole("textbox", { name: "Câu tiếng Anh của bạn" }), { target: { value: text } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
  }

  it("shows only the Vietnamese, and accepts a matching translation (AC-001, AC-002)", async () => {
    const { onOutcome } = setup([await translateStep()]);
    expect(screen.getByText("Dịch câu sau sang tiếng Anh")).toBeInTheDocument();
    expect(screen.getByText("Nhắm mắt lại và tưởng tượng biển cả.")).toBeInTheDocument();
    expect(screen.queryByText("Close your eyes and imagine the sea.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kiểm tra" })).toBeDisabled();

    await answer("close your eyes, and imagine the sea");
    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Câu của mình cũng đúng" })).not.toBeInTheDocument();
    expect(onOutcome).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ itemId: "sentence:sea", exercise: "translate", result: expect.objectContaining({ correct: true }) }));
  });

  it("shows the learner's answer, the reference and the grammar link after a wrong answer, and records it on Continue (AC-003)", async () => {
    const { onOutcome, onFinish } = setup([await translateStep()]);
    await answer("Shut your eyes and picture the sea.");
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();
    expect(screen.getByText("Shut your eyes and picture the sea.")).toBeInTheDocument();
    expect(screen.getAllByText("Close your eyes and imagine the sea.").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Xem lại: imperative" })).toBeInTheDocument();
    expect(onOutcome).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalledWith({ correct: 0, total: 1 }));
    expect(onOutcome).toHaveBeenCalledTimes(1);
    expect(onOutcome.mock.calls[0][1]).toMatchObject({ result: { correct: false }, related: ["grammar:imperative"] });
  });

  it("counts a claimed answer as correct but hard, once, and moves on (AC-006, AC-007)", async () => {
    const claims = await import("@/claims/claims-client");
    const submit = vi.spyOn(claims, "submitClaim").mockImplementation(() => {});
    const { onOutcome, onFinish } = setup([await translateStep()]);
    await answer("Shut your eyes and picture the sea.");
    fireEvent.click(screen.getByRole("button", { name: "Câu của mình cũng đúng" }));

    expect(screen.getByText("Đã tính là đúng")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Câu của mình cũng đúng" })).not.toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith({
      sentenceId: "sentence:sea",
      answer: "Shut your eyes and picture the sea.",
      expected: "Close your eyes and imagine the sea.",
      vi: "Nhắm mắt lại và tưởng tượng biển cả.",
      related: ["grammar:imperative"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalledWith({ correct: 1, total: 1 }));
    expect(onOutcome).toHaveBeenCalledTimes(1);
    expect(onOutcome.mock.calls[0][1].result).toMatchObject({ correct: true, hinted: true, claimed: true });
    submit.mockRestore();
  });

  it("doesn't retry a claimed answer in a library run", async () => {
    const claims = await import("@/claims/claims-client");
    const submit = vi.spyOn(claims, "submitClaim").mockImplementation(() => {});
    const onFinish = vi.fn();
    render(<ExerciseRunner steps={[await translateStep()]} retryWrong onOutcome={vi.fn()} onFinish={onFinish} onExit={vi.fn()} />);
    await answer("Shut your eyes and picture the sea.");
    fireEvent.click(screen.getByRole("button", { name: "Câu của mình cũng đúng" }));
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await vi.waitFor(() => expect(onFinish).toHaveBeenCalledWith({ correct: 1, total: 1 }));
    expect(screen.queryByRole("button", { name: "Làm lại câu sai" })).not.toBeInTheDocument();
    submit.mockRestore();
  });

  it("offers no claim for an answer far longer than the sentence (AC-010)", async () => {
    setup([await translateStep()]);
    await answer("word ".repeat(30));
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Câu của mình cũng đúng" })).not.toBeInTheDocument();
  });

  it("records a held wrong answer when the learner leaves", async () => {
    const { onOutcome, onExit } = setup([await translateStep(), await translateStep("t2")]);
    await answer("Shut your eyes and picture the sea.");
    fireEvent.click(screen.getByRole("button", { name: "Thoát" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Dừng lại" })));
    expect(onOutcome).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalled();
  });
});

describe("translate with AI grading (feature 033)", () => {
  const OTHER = "Shut your eyes and picture the sea.";

  async function translateStep(key = "t") {
    const { buildTranslate } = await import("@/learning/exercises/translate");
    const { sentence } = await import("@/learning/exercises/fixtures");
    const item = sentence("sea", { tokens: ["Close", "your", "eyes", "and", "imagine", "the", "sea."], vi: "Nhắm mắt lại và tưởng tượng biển cả." });
    return { key, type: "exercise" as const, instance: buildTranslate({ sentence: item })!, seed: 1, related: { cardIds: ["word:sea" as const] } };
  }

  async function answer(text: string) {
    fireEvent.change(screen.getByRole("textbox", { name: "Câu tiếng Anh của bạn" }), { target: { value: text } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
  }

  async function mocks(verdict: { correct: boolean; explanationVi: string } | null | Promise<{ correct: boolean; explanationVi: string } | null>) {
    const { addAiKey, resetAiKeysForTest } = await import("@/lib/ai-keys");
    localStorage.clear();
    resetAiKeysForTest();
    addAiKey("key-1");
    const client = await import("@/ai-grading/gemini-client");
    const claims = await import("@/claims/claims-client");
    return {
      grade: vi.spyOn(client, "gradeWithAi").mockImplementation(() => Promise.resolve(verdict)),
      submit: vi.spyOn(claims, "submitClaim").mockImplementation(() => {}),
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("doesn't call the AI for an answer that matches (AC-007)", async () => {
    const { grade } = await mocks({ correct: true, explanationVi: "" });
    setup([await translateStep()]);
    await answer("close your eyes and imagine the sea");
    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
    expect(grade).not.toHaveBeenCalled();
  });

  it("marks a different right wording correct with a normal rating and sends it to the owner as AI-accepted (AC-008, AC-009, AC-011, AC-017)", async () => {
    const { grade, submit } = await mocks({ correct: true, explanationVi: "" });
    const { onOutcome } = setup([await translateStep()]);
    await answer(OTHER);
    expect(grade).toHaveBeenCalledWith({ vi: "Nhắm mắt lại và tưởng tượng biển cả.", en: "Close your eyes and imagine the sea." }, OTHER, expect.any(AbortSignal));
    expect(screen.getByText("Chính xác!")).toBeInTheDocument();
    expect(screen.getByText("Chấm bằng AI")).toBeInTheDocument();
    expect(screen.getByText(/Một cách nói khác/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Câu của mình cũng đúng" })).not.toBeInTheDocument();
    expect(onOutcome).toHaveBeenCalledTimes(1);
    const { result } = onOutcome.mock.calls[0][1];
    expect(result).toMatchObject({ correct: true, aiGraded: true });
    expect(result.hinted).toBeUndefined();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ sentenceId: "sentence:sea", answer: OTHER, source: "ai", related: ["word:sea"] }));
  });

  it("shows the AI's explanation on a wrong answer and keeps the claim (AC-010)", async () => {
    const { submit } = await mocks({ correct: false, explanationVi: "Bạn dùng sai động từ." });
    const { onOutcome } = setup([await translateStep()]);
    await answer(OTHER);
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();
    expect(screen.getByText("Bạn dùng sai động từ.")).toBeInTheDocument();
    expect(screen.getByText("Chấm bằng AI")).toBeInTheDocument();
    expect(onOutcome).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Câu của mình cũng đúng" }));
    expect(submit).toHaveBeenCalledWith(expect.not.objectContaining({ source: "ai" }));
  });

  it("falls back to matching with a notice when no key could answer (AC-016)", async () => {
    await mocks(null);
    setup([await translateStep()]);
    await answer(OTHER);
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();
    expect(screen.getByText(/chưa chấm bằng AI được/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Câu của mình cũng đúng" })).toBeInTheDocument();
  });

  it("uses matching only when the learner has no key (AC-006)", async () => {
    const { grade } = await mocks({ correct: true, explanationVi: "" });
    localStorage.clear();
    (await import("@/lib/ai-keys")).resetAiKeysForTest();
    setup([await translateStep()]);
    await answer(OTHER);
    expect(grade).not.toHaveBeenCalled();
    expect(screen.getByText("Chưa đúng")).toBeInTheDocument();
    expect(screen.queryByText(/chưa chấm bằng AI được/)).not.toBeInTheDocument();
  });

  it("locks the answer while grading and drops a late verdict after leaving", async () => {
    let resolve!: (verdict: { correct: boolean; explanationVi: string }) => void;
    const { grade } = await mocks(new Promise((done) => (resolve = done)));
    const { onOutcome, onExit } = setup([await translateStep()]);
    await answer(OTHER);
    expect(screen.getByRole("button", { name: "Đang chấm…" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Câu tiếng Anh của bạn" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Thoát" }));
    expect(onExit).toHaveBeenCalled();
    cleanup();
    expect(grade.mock.calls[0][2]?.aborted).toBe(true);
    await act(async () => resolve({ correct: true, explanationVi: "" }));
    expect(onOutcome).not.toHaveBeenCalled();
  });

  it("rates on the learner's time, not the wait for AI (AC-011)", async () => {
    let resolve!: (verdict: { correct: boolean; explanationVi: string }) => void;
    await mocks(new Promise((done) => (resolve = done)));
    const now = vi.spyOn(performance, "now");
    now.mockReturnValue(1000);
    const { onOutcome } = setup([await translateStep()]);
    now.mockReturnValue(3000);
    await answer(OTHER);
    now.mockReturnValue(20_000);
    await act(async () => resolve({ correct: true, explanationVi: "" }));
    expect(onOutcome.mock.calls[0][1].ms).toBe(2000);
  });
});
