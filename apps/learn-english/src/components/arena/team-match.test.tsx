import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicTeamRoom } from "@/learning/arena/team-protocol";
import { formatClock, TeamMatch, teamAnnouncement } from "./team-match";
import { HOST, teamHandle, teamPlayer, teamRoom } from "./test-team-room";
import type { TeamRoomHandle } from "./use-team-room";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const NOW = 1_800_000_000_000;
const RECALL = { type: "recall" as const, meaningsVi: ["vui vẻ"], pos: "adjective", mask: "_____" };
const WRITE = { type: "write" as const, vi: "Tôi vui." };
const LISTEN = { type: "listen" as const, audio: "a".repeat(64), options: ["apple", "angle", "ankle", "amber"] };

/** Minh Anh and Hoa on Đội A, Lan on Đội B; Minh Anh's turn on a recall question. */
function inQuestion(overrides: Partial<PublicTeamRoom> = {}): PublicTeamRoom {
  return teamRoom({
    phase: "question",
    round: 1,
    number: 3,
    players: [teamPlayer(HOST), teamPlayer("hoa"), teamPlayer("lan")],
    teams: {
      A: { members: [HOST, "hoa"], score: 2, hints: 2, roundsWon: 0 },
      B: { members: ["lan"], score: 1, hints: 1, roundsWon: 0 },
    },
    roundEndsAt: NOW + 245_000,
    turn: { team: "A", userId: HOST },
    deadline: NOW + 12_000,
    question: RECALL,
    questionType: "recall",
    ...overrides,
  });
}

function match(room: PublicTeamRoom, me = HOST, overrides: Partial<Omit<TeamRoomHandle, "room">> = {}) {
  const handle = teamHandle(room, overrides);
  const view = render(<TeamMatch handle={handle} me={me} />);
  return { handle, ...view };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  push.mockReset();
  vi.stubGlobal(
    "Audio",
    class {
      play() {
        return Promise.resolve();
      }
      pause() {}
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("TeamMatch top bar (AC-017)", () => {
  it("shows the round clock, the round and both teams' scores and hints", () => {
    match(inQuestion({ settings: { ...inQuestion().settings, rounds: 3 } }));
    expect(screen.getByRole("timer", { name: "Hiệp còn 4:05" })).toBeInTheDocument();
    expect(screen.getByText("Hiệp 1/3")).toBeInTheDocument();
    expect(screen.getByText("2 gợi ý")).toBeInTheDocument();
    expect(screen.getByText("1 gợi ý")).toBeInTheDocument();
    expect(screen.getAllByText(/thắng 0 hiệp/)).toHaveLength(2);
  });

  it("freezes the clock at roundLeftMs while paused", () => {
    match(inQuestion({ phase: "paused", roundEndsAt: null, roundLeftMs: 90_000, pausedTeam: "B", deadline: NOW + 30_000 }));
    expect(screen.getByRole("timer", { name: "Hiệp còn 1:30" })).toBeInTheDocument();
    vi.advanceTimersByTime(5_000);
    expect(screen.getByRole("timer", { name: "Hiệp còn 1:30" })).toBeInTheDocument();
  });

  it("says time is up, with the last or the extra question (AC-027, AC-028)", () => {
    const { unmount } = match(inQuestion({ roundEndsAt: NOW - 1_000 }));
    expect(screen.getByText("Hết giờ")).toBeInTheDocument();
    expect(screen.getByText("Câu cuối")).toBeInTheDocument();
    unmount();
    match(inQuestion({ roundEndsAt: NOW - 1_000, stage: "extra", turn: { team: "B", userId: "lan" } }));
    expect(screen.getByText("Câu bù cho Đội B")).toBeInTheDocument();
  });

  it("shows the sudden-death pair instead of the clock (AC-037)", () => {
    match(inQuestion({ stage: "sudden", suddenPair: 2, roundEndsAt: null }));
    expect(screen.getByText("Đấu phụ · cặp 2/3")).toBeInTheDocument();
    expect(screen.queryByRole("timer", { name: /Hiệp còn/ })).not.toBeInTheDocument();
  });

  it("formats the clock as m:ss", () => {
    expect(formatClock(600_000)).toBe("10:00");
    expect(formatClock(4_001)).toBe("0:05");
    expect(formatClock(0)).toBe("0:00");
  });
});

describe("TeamMatch turns (AC-020, AC-021)", () => {
  it("gives the turn player the answer box, focused, and sends answers", () => {
    const { handle } = match(inQuestion());
    expect(screen.getByText("Lượt của bạn")).toBeInTheDocument();
    expect(screen.getByText(/Câu 3/)).toBeInTheDocument();
    const input = screen.getByLabelText("Từ tiếng Anh");
    expect(input).toBeEnabled();
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "happy" } });
    expect(handle.typingStarted).toHaveBeenCalled();
    fireEvent.submit(input.closest("form")!);
    expect(handle.answer).toHaveBeenCalledWith("happy");
  });

  it("shows a watcher the same card read-only with whose turn it is and the typing dot", () => {
    match(inQuestion(), "lan", { typing: true });
    expect(screen.getByText("Lượt của Minh Anh · Đội A")).toBeInTheDocument();
    expect(screen.getByLabelText("Từ tiếng Anh")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Gửi/ })).not.toBeInTheDocument();
    expect(screen.getByText("Đang gõ")).toBeInTheDocument();
  });

  it("tells watchers the turn player got it wrong", () => {
    match(inQuestion(), "lan", { wrong: { userId: HOST, count: 1 } });
    expect(screen.getByText(/Minh Anh trả lời sai/)).toBeInTheDocument();
  });

  it("lets only the turn player pick on a listening question", () => {
    const listen = inQuestion({ question: LISTEN, questionType: "listen" });
    const { handle, unmount } = match(listen);
    fireEvent.click(screen.getByRole("radio", { name: /ankle/ }));
    expect(handle.choose).toHaveBeenCalledWith(2);
    unmount();
    match(listen, "lan");
    expect(screen.getByRole("radio", { name: /ankle/ })).toBeDisabled();
  });

  it("announces the turn to screen readers", () => {
    const room = inQuestion({ turn: { team: "B", userId: "lan" } });
    expect(teamAnnouncement(room, HOST)).toBe("Đến lượt Đội B: Lan. Nhớ lại từ.");
    expect(teamAnnouncement(room, "lan")).toBe("Đến lượt bạn. Nhớ lại từ.");
  });
});

describe("TeamMatch hints (AC-032 to AC-035)", () => {
  it("offers the turn player a hint on recall and write questions", () => {
    const { handle, unmount } = match(inQuestion());
    fireEvent.click(screen.getByRole("button", { name: "Gợi ý (còn 2)" }));
    expect(handle.hint).toHaveBeenCalled();
    unmount();
    match(inQuestion({ question: WRITE, questionType: "write" }));
    expect(screen.getByRole("button", { name: "Gợi ý (còn 2)" })).toBeEnabled();
  });

  it("offers no hint at 0 hints, and disables it once used", () => {
    const empty = inQuestion();
    empty.teams.A.hints = 0;
    const { unmount } = match(empty);
    expect(screen.queryByRole("button", { name: /Gợi ý/ })).toBeNull();
    unmount();
    match(inQuestion({ hint: "h****" }));
    expect(screen.getByRole("button", { name: /Gợi ý \(còn/ })).toBeDisabled();
  });

  it("hides the hint on listening questions and from other players", () => {
    const { unmount } = match(inQuestion({ question: LISTEN, questionType: "listen" }));
    expect(screen.queryByRole("button", { name: /Gợi ý/ })).not.toBeInTheDocument();
    unmount();
    match(inQuestion(), "hoa");
    expect(screen.queryByRole("button", { name: /Gợi ý/ })).not.toBeInTheDocument();
  });

  it("shows a used hint to everyone, with the first tile filled", () => {
    match(inQuestion({ hint: "h****" }), "lan");
    expect(screen.getByText("Gợi ý:")).toBeInTheDocument();
    expect(screen.getByText("h****")).toBeInTheDocument();
    expect(screen.getByText("h")).toHaveAttribute("data-hint", "true");
  });
});

describe("TeamMatch reveal, pause and round end", () => {
  it("shows a right answer with the team's point (AC-025)", () => {
    match(inQuestion({ phase: "reveal", reveal: { answer: "happy", answeredBy: HOST, correct: true, by: HOST } }), "lan");
    expect(screen.getByText("Đúng!")).toBeInTheDocument();
    expect(screen.getByText("+1 Đội A")).toBeInTheDocument();
    expect(screen.getByText("happy")).toBeInTheDocument();
  });

  it("shows a wrong answer", () => {
    const room = inQuestion({ phase: "reveal", reveal: { answer: "happy", answeredBy: null, correct: false, by: HOST } });
    match(room, "lan");
    expect(screen.getByText("Sai")).toBeInTheDocument();
    expect(screen.queryByText(/\+1/)).not.toBeInTheDocument();
    expect(teamAnnouncement(room, "lan")).toBe("Sai. Đáp án: happy.");
  });

  it("waits for a dropped team (AC-045)", () => {
    match(inQuestion({ phase: "paused", pausedTeam: "B", roundEndsAt: null, roundLeftMs: 60_000, deadline: NOW + 30_000 }));
    expect(screen.getByText("Đang chờ Đội B kết nối lại…")).toBeInTheDocument();
    expect(screen.getByRole("timer", { name: "Thời gian chờ: còn 30 giây" })).toBeInTheDocument();
  });

  it("says which team won the round, or that it was a draw (AC-029)", () => {
    const won = inQuestion({ phase: "round-end", roundEndsAt: null, deadline: NOW + 5_000, rounds: [{ round: 1, scores: { A: 6, B: 4 }, winner: "A", suddenDeath: false }] });
    const { unmount } = match(won);
    expect(screen.getByRole("heading", { name: /Đội A thắng hiệp 1/ })).toBeInTheDocument();
    expect(screen.getByText(/Hiệp sau bắt đầu sau 5 giây/)).toBeInTheDocument();
    unmount();
    match({ ...won, rounds: [{ round: 1, scores: { A: 5, B: 5 }, winner: null, suddenDeath: true }] });
    expect(screen.getByRole("heading", { name: "Hiệp 1 hòa" })).toBeInTheDocument();
  });

  it("shows 3, 2, 1 before the round", () => {
    match(teamRoom({ phase: "countdown", round: 1, deadline: NOW + 2_500 }));
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("TeamMatch leaving", () => {
  it("asks first, then leaves and goes back to the Arena", () => {
    const { handle } = match(inQuestion(), "hoa");
    fireEvent.click(screen.getByRole("button", { name: "Rời trận" }));
    expect(screen.getByText(/Bạn sẽ ra khỏi lượt chơi của đội/)).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Rời trận" });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(handle.leave).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/arena");
  });
});
