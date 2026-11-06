import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Lobby } from "./lobby";
import { ME, RIVAL, player, publicRoom, roomHandle } from "./test-room";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function lobby(overrides: Parameters<typeof publicRoom>[0] = {}, me = ME) {
  const handle = roomHandle(publicRoom(overrides));
  render(<Lobby handle={handle as Parameters<typeof Lobby>[0]["handle"]} me={me} />);
  return handle;
}

describe("Lobby", () => {
  it("shows the room code as tiles, readable as letters, with copy, link and QR (AC-003)", () => {
    lobby();
    expect(screen.getByText("K 7 P 2 Q X")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sao chép mã" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sao chép liên kết" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mã QR" })).toBeInTheDocument();
  });

  it("copies the invite link to the room", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    lobby();
    fireEvent.click(screen.getByRole("button", { name: "Sao chép liên kết" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/arena/room?code=K7P2QX`);
  });

  it("waits for an opponent with a hint to share the code", () => {
    lobby();
    expect(screen.getByText(/Đang chờ đối thủ/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sẵn sàng/ })).not.toBeInTheDocument();
  });

  it("shows both players with names and who is who (AC-004)", () => {
    lobby({ phase: "ready", players: [player(ME), player(RIVAL)], deadline: Date.now() + 30_000 });
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Minh Anh");
    expect(rows[0]).toHaveTextContent("Bạn");
    expect(rows[0]).toHaveTextContent("Chủ phòng");
    expect(rows[1]).toHaveTextContent("Lan");
    expect(rows[1]).toHaveTextContent("Đối thủ");
  });

  it("counts down the Ready window and sends Sẵn sàng (AC-007, AC-008)", () => {
    const handle = lobby({ phase: "ready", players: [player(ME), player(RIVAL, { ready: true })], deadline: Date.now() + 24_000 });
    expect(screen.getByRole("timer")).toHaveAccessibleName("Thời gian sẵn sàng: còn 24 giây");
    expect(screen.getAllByText("Sẵn sàng").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Sẵn sàng/ }));
    expect(handle.ready).toHaveBeenCalled();
  });

  it("shows a pressed Ready once you're ready", () => {
    lobby({ phase: "ready", players: [player(ME, { ready: true }), player(RIVAL)], deadline: Date.now() + 10_000 });
    expect(screen.getByRole("button", { name: /Đã sẵn sàng/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("lets only the creator open a new window after it ran out (AC-009)", () => {
    const handle = lobby({ phase: "lobby", players: [player(ME), player(RIVAL)] });
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu lại/ }));
    expect(handle.start).toHaveBeenCalled();

    document.body.innerHTML = "";
    lobby({ phase: "lobby", players: [player(ME), player(RIVAL)] }, RIVAL);
    expect(screen.queryByRole("button", { name: /Bắt đầu lại/ })).not.toBeInTheDocument();
    expect(screen.getByText("Chờ chủ phòng bắt đầu lại…")).toBeInTheDocument();
  });

  it("tells the opponent when the creator changes the settings, but not the creator (AC-031)", () => {
    const before = publicRoom({ phase: "ready", players: [player(ME), player(RIVAL)], deadline: Date.now() + 30_000 });
    const after = { ...before, settings: { mode: "write", level: "B1", rounds: 1, seconds: 15 } as const };
    const opponent = render(<Lobby handle={roomHandle(before) as Parameters<typeof Lobby>[0]["handle"]} me={RIVAL} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    opponent.rerender(<Lobby handle={roomHandle(after) as Parameters<typeof Lobby>[0]["handle"]} me={RIVAL} />);
    expect(screen.getByRole("status")).toHaveTextContent("Chủ phòng đã đổi cài đặt: Viết câu · B1 · 1 hiệp");
    opponent.unmount();

    const creator = render(<Lobby handle={roomHandle(before) as Parameters<typeof Lobby>[0]["handle"]} me={ME} />);
    creator.rerender(<Lobby handle={roomHandle(after) as Parameters<typeof Lobby>[0]["handle"]} me={ME} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("marks a player who lost their connection", () => {
    lobby({ phase: "ready", players: [player(ME), player(RIVAL, { connected: false })], deadline: Date.now() + 10_000 });
    expect(screen.getByText("Mất kết nối")).toBeInTheDocument();
  });
});
