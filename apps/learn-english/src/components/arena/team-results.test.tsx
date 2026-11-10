import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test-utils/render";
import type { PublicTeamRoom } from "@/learning/arena/team-protocol";
import { TeamResults } from "./team-results";
import { HOST, teamHandle, teamPlayer as player, teamRoom } from "./test-team-room";

const PLAYERS = [player(HOST, { answered: 5, correct: 3 }), player("lan", { answered: 4, correct: 4 }), player("hoa", { answered: 6, correct: 2 })];
const team = (members: string[], roundsWon: number) => ({ members, score: 0, hints: 0, roundsWon });

function ended(overrides: Partial<PublicTeamRoom> = {}): PublicTeamRoom {
  return teamRoom({
    phase: "match-end",
    players: PLAYERS,
    teams: { A: team([HOST, "lan"], 2), B: team(["hoa"], 1) },
    settings: { mode: "mixed", level: "A2", rounds: 3, seconds: 15, size: 6, minutes: 5 },
    rounds: [
      { round: 1, scores: { A: 9, B: 7 }, winner: "A", suddenDeath: false },
      { round: 2, scores: { A: 5, B: 6 }, winner: "B", suddenDeath: true },
      { round: 3, scores: { A: 8, B: 4 }, winner: "A", suddenDeath: false },
    ],
    winner: "A",
    endReason: "won",
    ...overrides,
  });
}

function results(room: PublicTeamRoom, me = HOST) {
  const handle = teamHandle(room);
  render(<TeamResults handle={handle} me={me} />);
  return handle;
}

describe("TeamResults (feature 039)", () => {
  it("names the winning team, each round and the learner's outcome (AC-038)", () => {
    results(ended());
    expect(screen.getByRole("heading", { name: "Đội A thắng!" })).toBeInTheDocument();
    expect(screen.getByText("Đội A của bạn thắng. Giỏi lắm!")).toBeInTheDocument();
    const rounds = within(screen.getByRole("list", { name: "Điểm từng hiệp" })).getAllByRole("listitem");
    expect(rounds).toHaveLength(3);
    expect(rounds[0]).toHaveTextContent("Hiệp 1");
    expect(rounds[0]).toHaveTextContent("9–7");
    expect(rounds[1]).toHaveTextContent("Đội B thắng ở đấu phụ");
  });

  it("tells a player on the other team they lost", () => {
    results(ended(), "hoa");
    expect(screen.getByText("Đội B của bạn thua. Lần sau cố lên nhé!")).toBeInTheDocument();
  });

  it("shows Hòa with no winner, and a drawn round (AC-039)", () => {
    results(ended({ winner: "draw", rounds: [{ round: 1, scores: { A: 6, B: 6 }, winner: null, suddenDeath: true }], teams: { A: team([HOST, "lan"], 0), B: team(["hoa"], 0) } }));
    expect(screen.getByRole("heading", { name: "Hòa" })).toBeInTheDocument();
    expect(screen.getByText("Hai đội hòa nhau. Trận sau phân thắng bại nhé!")).toBeInTheDocument();
    expect(screen.getByText("Hiệp này hòa")).toBeInTheDocument();
  });

  it("says which team left when the match ended by forfeit", () => {
    results(ended({ winner: "B", endReason: "forfeit" }));
    expect(screen.getByRole("heading", { name: "Đội B thắng!" })).toBeInTheDocument();
    expect(screen.getByText("Đội A rời trận")).toBeInTheDocument();
  });

  it("lists both teams with each player's right answers out of turns (AC-041)", () => {
    results(ended());
    const a = within(screen.getAllByRole("region", { name: /đúng\/lượt/ })[0]).getAllByRole("listitem");
    expect(a[0]).toHaveTextContent("Minh Anh (bạn)");
    expect(a[0]).toHaveTextContent("đúng 3 trên 5 lượt");
    expect(a[1]).toHaveTextContent("đúng 4 trên 4 lượt");
    expect(within(screen.getAllByRole("region", { name: /đúng\/lượt/ })[1]).getByText("Hoa")).toBeInTheDocument();
  });

  it("offers Chơi lại to the host only (AC-051)", () => {
    const handle = results(ended());
    fireEvent.click(screen.getByRole("button", { name: /Chơi lại/ }));
    expect(handle.again).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Về Đấu trường" })).toHaveAttribute("href", "/arena");
    document.body.innerHTML = "";

    results(ended(), "lan");
    expect(screen.queryByRole("button", { name: /Chơi lại/ })).not.toBeInTheDocument();
    expect(screen.getByText("Chờ chủ phòng chơi lại…")).toBeInTheDocument();
  });
});
