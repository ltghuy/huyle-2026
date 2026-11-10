import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import type { PublicTeamRoom } from "@/learning/arena/team-protocol";
import { LiveTeamRoom } from "./team-room";
import { HOST, teamHandle, teamPlayer as player, teamRoom } from "./test-team-room";
import type { TeamRoomHandle } from "./use-team-room";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("./team-match", () => ({ TeamMatch: ({ handle }: { handle: { room: PublicTeamRoom } }) => <p>Trận đang chơi: {handle.room.phase}</p> }));
vi.mock("./team-edit-settings", () => ({ TeamEditSettings: ({ minSize }: { minSize: number }) => <button type="button">Đổi cài đặt (ít nhất {minSize})</button> }));
vi.mock("./team-settings-fields", () => ({ teamSettingsLine: (s: PublicTeamRoom["settings"]) => `${s.mode} · ${s.level} · ${s.minutes} phút/hiệp` }));

let handle: TeamRoomHandle = teamHandle(teamRoom(), { status: "connecting" });
vi.mock("./use-team-room", () => ({ useTeamRoom: () => handle }));

const setRoom = vi.fn();
vi.mock("@/lib/link-client", () => ({ link: { setRoom: (code: string | null) => setRoom(code) } }));

function show(me = HOST) {
  return render(<LiveTeamRoom code="K7P2QX" me={me} ticket="ticket-1" refreshTicket={async () => "ticket-2"} />);
}

beforeEach(() => {
  push.mockClear();
  setRoom.mockClear();
});

const TWO = [player(HOST), player("lan")];

describe("LiveTeamRoom (feature 039)", () => {
  it("waits for the room, then shows the lobby with the settings line, Rời phòng and the host's Đổi cài đặt (AC-007, AC-049)", () => {
    handle = { ...teamHandle(teamRoom()), room: null, status: "connecting" };
    const view = show();
    expect(screen.getByText(/Đang vào phòng K7P2QX/)).toBeInTheDocument();

    handle = teamHandle(teamRoom({ players: TWO }));
    view.rerender(<LiveTeamRoom code="K7P2QX" me={HOST} ticket="ticket-1" refreshTicket={async () => "ticket-2"} />);
    expect(screen.getByText("mixed · A2 · 5 phút/hiệp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đổi cài đặt (ít nhất 2)" })).toBeInTheDocument();
    expect(screen.getByText("2/6 người")).toBeInTheDocument();
    expect(setRoom).toHaveBeenLastCalledWith("K7P2QX");
  });

  it("leaves the lobby and goes back to the Arena (AC-047)", () => {
    handle = teamHandle(teamRoom({ players: TWO }));
    show("lan");
    expect(screen.queryByRole("button", { name: /Đổi cài đặt/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Rời phòng/ }));
    expect(handle.leave).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/arena");
  });

  it("tells non-hosts when the host changes the settings (AC-049)", () => {
    const before = teamRoom({ players: TWO });
    handle = teamHandle(before);
    const view = show("lan");
    expect(screen.queryByText(/Chủ phòng đã đổi cài đặt/)).not.toBeInTheDocument();
    handle = teamHandle({ ...before, settings: { ...before.settings, mode: "write", minutes: 10 } });
    view.rerender(<LiveTeamRoom code="K7P2QX" me="lan" ticket="ticket-1" refreshTicket={async () => "ticket-2"} />);
    expect(screen.getByText("Chủ phòng đã đổi cài đặt: write · A2 · 10 phút/hiệp")).toBeInTheDocument();
    view.unmount();

    handle = teamHandle(before);
    const host = show();
    handle = teamHandle({ ...before, settings: { ...before.settings, mode: "write" } });
    host.rerender(<LiveTeamRoom code="K7P2QX" me={HOST} ticket="ticket-1" refreshTicket={async () => "ticket-2"} />);
    expect(screen.queryByText(/Chủ phòng đã đổi cài đặt/)).not.toBeInTheDocument();
  });

  it("switches to the match outside the lobby, with no Rời phòng or Đổi cài đặt (AC-016)", () => {
    handle = teamHandle(teamRoom({ players: TWO, phase: "question" }));
    show();
    expect(screen.getByText("Trận đang chơi: question")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rời phòng/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Đổi cài đặt/ })).not.toBeInTheDocument();
  });

  it("shows the result when the match ends (AC-038)", () => {
    handle = teamHandle(teamRoom({ players: TWO, phase: "match-end", winner: "A", endReason: "won", teams: { A: { members: [HOST], score: 0, hints: 0, roundsWon: 1 }, B: { members: ["lan"], score: 0, hints: 0, roundsWon: 0 } } }));
    show();
    expect(screen.getByText(/Đội A thắng!/)).toBeInTheDocument();
  });

  it("says when the connection is coming back", () => {
    handle = teamHandle(teamRoom({ players: TWO }), { status: "reconnecting" });
    show();
    expect(screen.getByText("Đang kết nối lại…")).toBeInTheDocument();
  });

  it("says the room closed, with the room's reason (AC-046)", () => {
    handle = teamHandle(teamRoom({ phase: "closed", endReason: "cancelled" }), { status: "closed", error: "Chủ phòng đã rời phòng." });
    show("lan");
    expect(screen.getByText("Chủ phòng đã rời phòng.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về Đấu trường" })).toBeInTheDocument();
  });
});
