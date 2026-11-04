import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicRoom } from "@/learning/arena/protocol";
import { announcement } from "./announcer";
import { Duel } from "./duel";
import { ME, RIVAL, player, publicRoom, roomHandle } from "./test-room";
import { timeWarning } from "./timer-bar";
import type { ArenaRoomHandle } from "./use-arena-room";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

const NOW = 1_800_000_000_000;
const QUESTION = { type: "listen" as const, audio: "a".repeat(64), options: ["apple", "angle", "ankle", "amber"] };

function inQuestion(overrides: Partial<PublicRoom> = {}): PublicRoom {
  return publicRoom({
    phase: "question",
    round: 1,
    questionIndex: 5,
    players: [player(ME, { score: 3 }), player(RIVAL, { score: 2 })],
    question: QUESTION,
    questionType: "listen",
    deadline: NOW + 11_000,
    ...overrides,
  });
}

function duel(room: PublicRoom, overrides: Partial<ArenaRoomHandle> = {}) {
  const handle = roomHandle(room, overrides);
  const view = render(<Duel handle={handle as Parameters<typeof Duel>[0]["handle"]} me={ME} />);
  return { handle, ...view };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  push.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("announcement", () => {
  it("names the question, who scored with the answer, and results", () => {
    expect(announcement(inQuestion(), ME)).toBe("Câu 6 trên 12. Nghe và chọn từ.");
    expect(announcement(inQuestion({ suddenDeath: 1 }), ME)).toBe("Câu quyết định. Nghe và chọn từ.");
    expect(announcement(inQuestion({ phase: "reveal", reveal: { answer: "apple", answeredBy: RIVAL } }), ME)).toBe("Lan trả lời đúng trước. Đáp án: apple.");
    expect(announcement(inQuestion({ phase: "reveal", reveal: { answer: "apple", answeredBy: ME } }), ME)).toBe("Bạn trả lời đúng trước. Đáp án: apple.");
    expect(announcement(inQuestion({ phase: "reveal", reveal: { answer: "apple", answeredBy: null } }), ME)).toBe("Hết giờ, không ai đúng. Đáp án: apple.");
    expect(announcement(inQuestion({ phase: "paused", pausedFor: RIVAL }), ME)).toBe("Trận đấu tạm dừng. Đang chờ Lan kết nối lại.");
    expect(announcement(inQuestion({ phase: "match-end", winnerId: ME }), ME)).toBe("Bạn thắng trận đấu!");
  });
});

describe("timeWarning", () => {
  it("speaks only at 10 and 5 seconds", () => {
    expect(timeWarning(15)).toBe("");
    expect(timeWarning(10)).toBe("Còn 10 giây");
    expect(timeWarning(7)).toBe("Còn 10 giây");
    expect(timeWarning(5)).toBe("Còn 5 giây");
    expect(timeWarning(0)).toBe("");
  });
});

describe("the duel frame", () => {
  it("counts down before the first question (AC-008)", () => {
    duel(publicRoom({ phase: "countdown", players: [player(ME), player(RIVAL)], deadline: NOW + 2_500 }));
    expect(screen.getByText("3")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows both players' points, you labelled 'Bạn', and the question number and type", () => {
    duel(inQuestion());
    expect(screen.getByText("Hiệp 1. Bạn 3 điểm, Lan 2 điểm. Hiệp thắng: bạn 0, Lan 0.")).toBeInTheDocument();
    expect(screen.getByText(/Câu 6\/12/)).toBeInTheDocument();
    expect(screen.getAllByText(/Nghe và chọn từ/).length).toBeGreaterThan(0);
  });

  it("drains the timer and turns red in the last 3 seconds (AC-012)", () => {
    const { container } = duel(inQuestion({ deadline: NOW + 2_500 }));
    expect(screen.getByText("3s")).toBeInTheDocument();
    expect(container.querySelector(".bg-destructive")).not.toBeNull();
  });

  it("marks sudden death", () => {
    duel(inQuestion({ suddenDeath: 1, questionIndex: 12 }));
    expect(screen.getByText("Câu quyết định")).toBeInTheDocument();
  });

  it("shows the rival typing and a short 'sai', never their text (AC-013)", () => {
    const { rerender, handle } = duel(inQuestion(), { typing: [RIVAL] });
    expect(screen.getByText("đang gõ", { exact: false })).toBeInTheDocument();
    rerender(<Duel handle={{ ...handle, wrong: { userId: RIVAL, count: 1 } } as Parameters<typeof Duel>[0]["handle"]} me={ME} />);
    expect(screen.getByText("Lan trả lời sai", { exact: false })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_300));
    expect(screen.queryByText("Lan trả lời sai", { exact: false })).not.toBeInTheDocument();
  });

  it("dims the match and waits for a player who dropped (AC-024)", () => {
    duel(inQuestion({ phase: "paused", pausedFor: RIVAL, deadline: NOW + 30_000 }));
    expect(screen.getByText("Đang chờ Lan kết nối lại…")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveAccessibleName("Thời gian chờ: còn 30 giây");
  });

  it("asks before leaving mid-match, since it counts as a loss", () => {
    const { handle } = duel(inQuestion());
    fireEvent.click(screen.getByRole("button", { name: /Rời trận/ }));
    expect(screen.getByText("Rời trận khi đang đấu sẽ tính là bạn thua trận này.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Đấu tiếp" }));
    expect(handle.leave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Rời trận/ }));
    const buttons = screen.getAllByRole("button", { name: "Rời trận" });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(handle.leave).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/arena");
  });
});
