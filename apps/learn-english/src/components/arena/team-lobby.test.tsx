import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { TeamLobby } from "./team-lobby";
import { HOST, teamHandle, teamPlayer as player, teamRoom } from "./test-team-room";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const FIVE = [player(HOST), player("lan"), player("hoa"), player("khoa", { connected: false }), player("an")];
const team = (members: string[]) => ({ members, score: 0, hints: 0, roundsWon: 0 });

function lobby(overrides: Parameters<typeof teamRoom>[0] = {}, me = HOST) {
  const handle = teamHandle(teamRoom(overrides));
  render(<TeamLobby handle={handle} me={me} />);
  return handle;
}

const list = (name: string) => screen.getByRole("region", { name });

describe("TeamLobby (feature 039)", () => {
  it("shows the code, the seats filled and every player as Chưa xếp đội at first (AC-003, AC-007, AC-008)", () => {
    lobby({ players: FIVE });
    expect(screen.getByText("K 7 P 2 Q X")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mã QR" })).toBeInTheDocument();
    expect(screen.getByText("5/6 người")).toBeInTheDocument();
    const unplaced = within(list("Chưa xếp đội")).getAllByRole("listitem");
    expect(unplaced).toHaveLength(5);
    expect(unplaced[0]).toHaveTextContent("Minh Anh (bạn)");
    expect(unplaced[0]).toHaveTextContent("Chủ phòng");
    expect(unplaced[3]).toHaveTextContent("Mất kết nối");
    expect(within(list("Đội A")).getByText("Chưa có ai.")).toBeInTheDocument();
  });

  it("lets the host put a player on a team, move them across, or take them off (AC-009)", () => {
    const handle = lobby({ players: FIVE, teams: { A: team(["lan"]), B: team([]) } });
    fireEvent.click(screen.getByRole("button", { name: "Đưa Hoa vào Đội B" }));
    expect(handle.assign).toHaveBeenCalledWith("hoa", "B");
    fireEvent.click(screen.getByRole("button", { name: "Đưa Minh Anh vào Đội A" }));
    expect(handle.assign).toHaveBeenCalledWith(HOST, "A");
    fireEvent.click(screen.getByRole("button", { name: "Chuyển Lan sang Đội B" }));
    expect(handle.assign).toHaveBeenCalledWith("lan", "B");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ Lan khỏi đội" }));
    expect(handle.assign).toHaveBeenCalledWith("lan", null);
  });

  it("numbers each team in turn order and reorders it with up and down (AC-010)", () => {
    const handle = lobby({ players: FIVE, teams: { A: team(["lan", "hoa", HOST]), B: team(["khoa"]) } });
    const rows = within(list("Đội A")).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent?.match(/Lượt thứ (\d)/)?.[1])).toEqual(["1", "2", "3"]);
    expect(screen.getByRole("button", { name: "Đưa Lan lên" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đưa Minh Anh xuống" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Đưa Hoa lên" }));
    expect(handle.order).toHaveBeenLastCalledWith("A", ["hoa", "lan", HOST]);
    fireEvent.click(screen.getByRole("button", { name: "Đưa Hoa xuống" }));
    expect(handle.order).toHaveBeenLastCalledWith("A", ["lan", HOST, "hoa"]);
    expect(screen.getByRole("button", { name: "Đưa Khoa lên" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đưa Khoa xuống" })).toBeDisabled();
  });

  it("splits at random for the host (AC-011)", () => {
    const handle = lobby({ players: FIVE });
    fireEvent.click(screen.getByRole("button", { name: /Chia ngẫu nhiên/ }));
    expect(handle.shuffle).toHaveBeenCalled();
  });

  it("keeps Bắt đầu disabled and says what is missing (AC-014)", () => {
    lobby({ players: FIVE, teams: { A: team(["lan", "hoa"]), B: team([]) } });
    expect(screen.getByRole("button", { name: /Bắt đầu/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Bắt đầu/ })).toHaveAccessibleDescription("Còn 3 người chưa xếp đội.");
    document.body.innerHTML = "";

    lobby({ players: FIVE, teams: { A: team(["lan", "hoa", HOST, "khoa", "an"]), B: team([]) } });
    expect(screen.getByRole("button", { name: /Bắt đầu/ })).toBeDisabled();
    expect(screen.getByText("Đội B chưa có ai.")).toBeInTheDocument();
    document.body.innerHTML = "";

    lobby();
    expect(screen.getByRole("button", { name: /Bắt đầu/ })).toBeDisabled();
  });

  it("starts with uneven teams and a room that isn't full (AC-012, AC-015, AC-016)", () => {
    const handle = lobby({ players: FIVE, teams: { A: team(["lan", "hoa", HOST]), B: team(["khoa", "an"]) } });
    const start = screen.getByRole("button", { name: /Bắt đầu/ });
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(handle.start).toHaveBeenCalled();
  });

  it("gives other players no team controls and waits for the host (AC-013)", () => {
    lobby({ players: FIVE, teams: { A: team(["lan", HOST]), B: team(["hoa"]) } }, "lan");
    expect(within(list("Đội A")).getAllByRole("listitem")[0]).toHaveTextContent("Lan (bạn)");
    expect(screen.queryByRole("button", { name: /Đưa|Chuyển|Bỏ/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Chia ngẫu nhiên/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bắt đầu/ })).not.toBeInTheDocument();
    expect(screen.getByText("Chờ chủ phòng bắt đầu…")).toBeInTheDocument();
  });

  it("lets only the host make the room public while a seat is free, and tells everyone (feature 041)", () => {
    const handle = lobby({ players: FIVE });
    fireEvent.click(screen.getByRole("button", { name: "Công khai lên Cộng đồng" }));
    expect(handle.publish).toHaveBeenCalledTimes(1);
  });

  it("shows players the public line, and nothing to the others before it (041 AC-002)", () => {
    lobby({ players: FIVE }, "lan");
    expect(screen.queryByRole("button", { name: "Công khai lên Cộng đồng" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Phòng đang hiện trên Cộng đồng/)).not.toBeInTheDocument();
    cleanup();
    lobby({ players: FIVE, public: true }, "lan");
    expect(screen.getByText(/Phòng đang hiện trên Cộng đồng/)).toBeInTheDocument();
  });

  it("hides both once every seat is taken (041 AC-003)", () => {
    lobby({ players: [...FIVE, player("binh")], public: true });
    expect(screen.queryByRole("button", { name: "Công khai lên Cộng đồng" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Phòng đang hiện trên Cộng đồng/)).not.toBeInTheDocument();
  });
});
