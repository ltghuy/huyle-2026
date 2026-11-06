import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import type { PublicRoom } from "@/learning/arena/protocol";
import { AnswerReveal } from "./answer-reveal";
import { MatchResult, RoundResult } from "./results";
import { ME, RIVAL, player, publicRoom } from "./test-room";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ wins: 4, losses: 2, streak: 1, bestStreak: 3 })),
  );
});
afterEach(() => vi.unstubAllGlobals());

const rival = player(RIVAL);

describe("AnswerReveal (AC-018)", () => {
  it("says you were faster with +1, and shows the word as tiles with its IPA and clip", () => {
    render(<AnswerReveal reveal={{ answer: "apple", ipa: "/ˈæp.əl/", audio: "a".repeat(64), answerIndex: 0, answeredBy: ME }} questionType="listen" me={ME} players={[rival]} />);
    expect(screen.getByText("Bạn nhanh hơn!")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("Đáp án: apple")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="tile"]')).toHaveLength(5);
    expect(screen.getByText("/ˈæp.əl/")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nghe: apple" })).toBeInTheDocument();
  });

  it("names the rival when they were faster, and says when time ran out", () => {
    const { rerender } = render(<AnswerReveal reveal={{ answer: "apple", answeredBy: RIVAL }} questionType="recall" me={ME} players={[rival]} />);
    expect(screen.getByText("Lan nhanh hơn")).toBeInTheDocument();
    rerender(<AnswerReveal reveal={{ answer: "I like apples.", answeredBy: null }} questionType="write" me={ME} players={[rival]} />);
    expect(screen.getByText("Hết giờ, không ai đúng")).toBeInTheDocument();
    // A sentence shows word by word, without a clip.
    expect(document.querySelectorAll('[data-slot="tile"]')).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Nghe/ })).not.toBeInTheDocument();
  });
});

function ended(overrides: Partial<PublicRoom> = {}): PublicRoom {
  return publicRoom({
    phase: "match-end",
    round: 2,
    players: [player(ME, { roundsWon: 2 }), player(RIVAL, { roundsWon: 0 })],
    rounds: [
      { round: 1, scores: { [ME]: 7, [RIVAL]: 5 }, winnerId: ME },
      { round: 2, scores: { [ME]: 6, [RIVAL]: 4 }, winnerId: ME },
    ],
    winnerId: ME,
    endReason: "won",
    ...overrides,
  });
}

describe("RoundResult (AC-020)", () => {
  it("shows who took the round and by how much, yours first", () => {
    render(<RoundResult room={ended({ phase: "round-end", rounds: [{ round: 1, scores: { [ME]: 5, [RIVAL]: 7 }, winnerId: RIVAL }], deadline: Date.now() + 5_000 })} me={ME} offset={0} />);
    expect(screen.getByText("Hiệp 1: Lan thắng")).toBeInTheDocument();
    expect(screen.getByText("5–7")).toBeInTheDocument();
    expect(screen.getByText(/Hiệp 2 bắt đầu sau 5 giây/)).toBeInTheDocument();
  });
});

describe("MatchResult (AC-022, AC-026, AC-027)", () => {
  it("celebrates a win with the round scores and the updated record", async () => {
    render(<MatchResult room={ended()} me={ME} onRematch={vi.fn()} onPick={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Bạn thắng!" })).toBeInTheDocument();
    expect(screen.getByText("Hiệp 1 · 7–5")).toBeInTheDocument();
    expect(screen.getByText("Hiệp 2 · 6–4")).toBeInTheDocument();
    expect(await screen.findByText("Thành tích: 4 thắng · 2 thua")).toBeInTheDocument();
    // Confetti is hidden for reduced motion.
    expect(document.querySelector(".animate-confetti")?.parentElement?.className).toContain("motion-reduce:hidden");
  });

  it("names the winner when you lost, without confetti", () => {
    render(<MatchResult room={ended({ winnerId: RIVAL })} me={ME} onRematch={vi.fn()} onPick={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Lan thắng" })).toBeInTheDocument();
    expect(document.querySelector(".animate-confetti")).toBeNull();
  });

  it("explains a forfeit from either side", () => {
    const { rerender } = render(<MatchResult room={ended({ endReason: "forfeit", rounds: [] })} me={ME} onRematch={vi.fn()} onPick={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Lan đã rời trận, bạn thắng" })).toBeInTheDocument();
    rerender(<MatchResult room={ended({ endReason: "forfeit", winnerId: RIVAL, rounds: [] })} me={ME} onRematch={vi.fn()} onPick={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Bạn đã rời trận" })).toBeInTheDocument();
  });

  it("asks for a rematch, then waits for the rival", () => {
    const onRematch = vi.fn();
    const { rerender } = render(<MatchResult room={ended({ rematch: [RIVAL] })} me={ME} onRematch={onRematch} onPick={vi.fn()} />);
    expect(screen.getByText("Lan muốn đấu lại!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Đấu lại/ }));
    expect(onRematch).toHaveBeenCalled();
    rerender(<MatchResult room={ended({ rematch: [ME] })} me={ME} onRematch={onRematch} onPick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Đang chờ Lan/ })).toBeDisabled();
  });

  it("can't rematch once the rival has left the room", () => {
    render(<MatchResult room={ended({ players: [player(ME), player(RIVAL, { connected: false })] })} me={ME} onRematch={vi.fn()} onPick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Đấu lại/ })).toBeDisabled();
    expect(screen.getByText("Lan đã rời phòng.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về Đấu trường" })).toHaveAttribute("href", "/arena");
  });

  it("explains a round level on points that the tie-break decided", () => {
    render(<MatchResult room={ended({ winnerId: RIVAL, rounds: [{ round: 1, scores: { [ME]: 2, [RIVAL]: 2 }, winnerId: RIVAL }] })} me={ME} onRematch={vi.fn()} onPick={vi.fn()} />);
    expect(screen.getByText(/Hòa điểm sau câu quyết định/)).toBeInTheDocument();
  });
});

describe("picking the next opponent (feature 027)", () => {
  const watched = (overrides: Partial<PublicRoom> = {}) => ended({ spectators: [{ id: "an", name: "An" }], ...overrides });

  it("lets the host pick the last opponent or a spectator instead of the two-way rematch (AC-001)", () => {
    const onPick = vi.fn();
    render(<MatchResult room={watched()} me={ME} onRematch={vi.fn()} onPick={onPick} />);
    expect(screen.getByRole("heading", { name: "Chọn đối thủ trận sau" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Đấu lại$/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /An/ }));
    expect(onPick).toHaveBeenCalledWith("an");
    fireEvent.click(screen.getByRole("button", { name: /Lan/ }));
    expect(onPick).toHaveBeenLastCalledWith(RIVAL);
  });

  it("leaves out a last opponent who has gone", () => {
    render(<MatchResult room={watched({ players: [player(ME), player(RIVAL, { connected: false })] })} me={ME} onRematch={vi.fn()} onPick={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Lan/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /An/ })).toBeInTheDocument();
  });

  it("tells the other player and spectators that the host is choosing (AC-007)", () => {
    const { unmount } = render(<MatchResult room={watched({ creatorId: RIVAL })} me={ME} onRematch={vi.fn()} onPick={vi.fn()} />);
    expect(screen.getByText("Chủ phòng đang chọn đối thủ trận sau…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đấu lại/ })).toBeEnabled();
    unmount();
    render(<MatchResult room={watched()} me="an" onRematch={vi.fn()} onPick={vi.fn()} />);
    expect(screen.getByText("Chủ phòng đang chọn đối thủ trận sau…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chọn đối thủ trận sau" })).not.toBeInTheDocument();
  });
});
