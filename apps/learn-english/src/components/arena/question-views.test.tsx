import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fillSlots } from "./letter-slots";
import { QuestionListen, QuestionRecall, QuestionWrite } from "./question-views";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const played: string[] = [];
beforeEach(() => {
  played.length = 0;
  vi.stubGlobal(
    "Audio",
    class {
      constructor(readonly src: string) {}
      play() {
        played.push(this.src);
        return Promise.resolve();
      }
      pause() {}
    },
  );
});

const LISTEN = { type: "listen" as const, audio: "a".repeat(64), options: ["apple", "angle", "ankle", "amber"] };
const RECALL = { type: "recall" as const, meaningsVi: ["kem"], pos: "noun", mask: "___-_____" };
const WRITE = { type: "write" as const, vi: "Tôi thích táo." };

describe("fillSlots", () => {
  it("fills letters in order and keeps the word's marks", () => {
    expect(fillSlots("___-_____", "icecr").map((s) => s.char).join("")).toBe("ice-cr");
    expect(fillSlots("___-_____", "ice-cream").map((s) => s.char).join("")).toBe("ice-cream");
    expect(fillSlots("____ _____", "lookafterX").map((s) => (s.kind === "gap" ? " " : s.char)).join("")).toBe("look after");
  });
});

describe("QuestionListen (AC-014)", () => {
  it("plays the clip once as it opens, and Space replays it", () => {
    render(<QuestionListen question={LISTEN} reveal={null} lockedOut={false} onChoose={vi.fn()} />);
    expect(played).toHaveLength(1);
    fireEvent.keyDown(window, { key: " " });
    expect(played).toHaveLength(2);
  });

  it("picks with a tap or the keys 1–4", () => {
    const onChoose = vi.fn();
    render(<QuestionListen question={LISTEN} reveal={null} lockedOut={false} onChoose={onChoose} />);
    fireEvent.click(screen.getByRole("radio", { name: /angle/ }));
    fireEvent.keyDown(window, { key: "4" });
    expect(onChoose.mock.calls).toEqual([[1], [3]]);
  });

  it("locks you out after a wrong pick and says so", () => {
    const onChoose = vi.fn();
    render(<QuestionListen question={LISTEN} reveal={null} lockedOut onChoose={onChoose} />);
    expect(screen.getByText("Bạn đã chọn sai, chờ đối thủ…")).toBeInTheDocument();
    expect(screen.getAllByRole("radio").every((option) => (option as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.keyDown(window, { key: "1" });
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("marks the right option at the reveal", () => {
    render(<QuestionListen question={LISTEN} reveal={{ answer: "ankle", answerIndex: 2, answeredBy: null }} lockedOut={false} onChoose={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /ankle/ }).className).toContain("border-success");
    expect(screen.getByRole("radio", { name: /apple/ }).className).toContain("text-muted-foreground");
  });
});

describe("QuestionRecall", () => {
  it("shows the meaning and fills the letter slots as you type, telling the rival once", () => {
    const onTyping = vi.fn();
    render(<QuestionRecall question={RECALL} wrongCount={0} closed={false} onAnswer={vi.fn()} onTyping={onTyping} />);
    expect(screen.getByText("kem")).toBeInTheDocument();
    const input = screen.getByLabelText("Từ tiếng Anh");
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "ice" } });
    expect(onTyping).toHaveBeenCalled();
    expect(screen.getAllByText(/^[ice]$/)).toHaveLength(3);
  });

  it("sends with Enter, and after a wrong try keeps the text selected with a note", () => {
    const onAnswer = vi.fn();
    const { rerender } = render(<QuestionRecall question={RECALL} wrongCount={0} closed={false} onAnswer={onAnswer} onTyping={vi.fn()} />);
    const input = screen.getByLabelText("Từ tiếng Anh") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "icecram" } });
    fireEvent.submit(input.form!);
    expect(onAnswer).toHaveBeenCalledWith("icecram");

    const select = vi.spyOn(input, "select");
    rerender(<QuestionRecall question={RECALL} wrongCount={3} closed={false} onAnswer={onAnswer} onTyping={vi.fn()} />);
    expect(select).toHaveBeenCalled();
    // The rival's wrong answer showing (your count back to 0) is not a try of yours.
    select.mockClear();
    rerender(<QuestionRecall question={RECALL} wrongCount={0} closed={false} onAnswer={onAnswer} onTyping={vi.fn()} />);
    expect(select).not.toHaveBeenCalled();
  });

  it("can't send once the question is closed", () => {
    render(<QuestionRecall question={RECALL} wrongCount={0} closed onAnswer={vi.fn()} onTyping={vi.fn()} />);
    expect(screen.getByLabelText("Từ tiếng Anh")).toBeDisabled();
  });
});

describe("QuestionWrite", () => {
  it("shows the Vietnamese and sends on Enter, while Shift+Enter is a new line", () => {
    const onAnswer = vi.fn();
    render(<QuestionWrite question={WRITE} wrongCount={0} closed={false} onAnswer={onAnswer} onTyping={vi.fn()} />);
    expect(screen.getByText("Tôi thích táo.")).toBeInTheDocument();
    const box = screen.getByLabelText("Câu tiếng Anh");
    fireEvent.change(box, { target: { value: "I like apples." } });
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(onAnswer).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onAnswer).toHaveBeenCalledWith("I like apples.");
  });
});
