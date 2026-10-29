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
    return { key: "d", type: "exercise" as const, instance: buildDictation({ sentence: item })!, seed: 1, fallback: buildWordOrder({ sentence: item }, 1) };
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

