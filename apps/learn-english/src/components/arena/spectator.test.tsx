import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicRoom } from "@/learning/arena/protocol";
import { render } from "@/test-utils/render";
import { Duel } from "./duel";
import { Lobby } from "./lobby";
import { ME, RIVAL, player, publicRoom, roomHandle } from "./test-room";

// What a spectator sees (feature 026, AC-004, AC-005): the live room with each player named, and nothing to press but "Kết bạn" (feature 031).

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
// Signed in as the viewer with no friends yet, so the friend button shows (feature 031).
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status: "signed-in", account: { userId: "an", name: "Viewer", email: "v@example.com", image: null } }),
}));
vi.mock("@/lib/social-client", async (original) => ({
  ...(await original<typeof import("@/lib/social-client")>()),
  pulse: async () => ({ now: 1, friends: [], outgoing: [], incoming: [], unread: 0 }),
}));

const NOW = 1_800_000_000_000;
const WATCHER = "an";
const PLAYERS = [player(ME, { score: 3 }), player(RIVAL, { score: 2 })];

function watched(overrides: Partial<PublicRoom> = {}): PublicRoom {
  return publicRoom({ phase: "question", round: 1, questionIndex: 4, players: PLAYERS, spectators: [{ id: WATCHER, name: "An" }], deadline: NOW + 10_000, ...overrides });
}

function duel(room: PublicRoom) {
  const handle = roomHandle(room);
  render(<Duel handle={handle as Parameters<typeof Duel>[0]["handle"]} me={WATCHER} />);
  return handle;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubGlobal(
    "Audio",
    class {
      play = () => Promise.resolve();
      pause = vi.fn();
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a spectator in the match", () => {
  it("names both players on the scoreboard and can't pick an option", () => {
    duel(watched({ question: { type: "listen", audio: "a".repeat(64), options: ["apple", "angle", "ankle", "amber"] }, questionType: "listen" }));
    const board = screen.getByRole("region", { name: "Tỉ số" });
    expect(board).toHaveTextContent("Minh Anh");
    expect(board).toHaveTextContent("Lan");
    expect(board).not.toHaveTextContent("Bạn");
    for (const option of screen.getAllByRole("radio")) expect(option).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Rời trận/ })).not.toBeInTheDocument();
  });

  it("sees a typed question without anything to type or send", () => {
    duel(watched({ question: { type: "write", vi: "Tôi thích táo." }, questionType: "write" }));
    expect(screen.getByText("Tôi thích táo.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gửi/ })).not.toBeInTheDocument();
  });

  it("is told who answered first by name", () => {
    duel(watched({ phase: "reveal", question: { type: "write", vi: "Tôi thích táo." }, questionType: "write", reveal: { answer: "I like apples.", answeredBy: RIVAL } }));
    expect(screen.getByText("Lan nhanh hơn")).toBeInTheDocument();
  });

  it("sees the winner and each round at the end, with no rematch", () => {
    duel(watched({ phase: "match-end", winnerId: RIVAL, endReason: "won", rounds: [{ round: 1, scores: { [ME]: 5, [RIVAL]: 7 }, winnerId: RIVAL }] }));
    expect(screen.getByRole("heading", { name: "Lan thắng!" })).toBeInTheDocument();
    expect(screen.getByText(/Hiệp 1 · 5–7/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Đấu lại/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về Đấu trường" })).toBeInTheDocument();
  });

  it("says who left on a forfeit", () => {
    duel(watched({ phase: "match-end", winnerId: ME, endReason: "forfeit" }));
    expect(screen.getByRole("heading", { name: "Lan đã rời trận, Minh Anh thắng" })).toBeInTheDocument();
  });
});

describe("a spectator in the lobby", () => {
  it("sees both seats and their Ready marks, with no Ready or start button, only Kết bạn (feature 031)", async () => {
    // The friend buttons wait on the social query, which needs real timers.
    vi.useRealTimers();
    const room = watched({ phase: "ready", players: [player(ME, { ready: true }), player(RIVAL)], question: null });
    render(<Lobby handle={{ ...roomHandle(room), room }} me={WATCHER} />);
    expect(screen.getByText("Minh Anh")).toBeInTheDocument();
    expect(screen.getByText("Lan")).toBeInTheDocument();
    expect(screen.getByText("Sẵn sàng")).toBeInTheDocument();
    expect(await screen.findAllByRole("button", { name: "Kết bạn" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Sẵn sàng|Bắt đầu/ })).not.toBeInTheDocument();
    expect(screen.getByText("Đang chờ hai người chơi bấm Sẵn sàng…")).toBeInTheDocument();
  });
});
