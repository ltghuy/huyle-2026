import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import ArenaRoomPage from "@/app/(focus)/arena/room/page";
import { ME, RIVAL, player, publicRoom, roomHandle } from "./test-room";
import type { ArenaRoomHandle } from "./use-arena-room";

let search = new URLSearchParams("code=K7P2QX");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/arena/room",
  useSearchParams: () => search,
}));

let handle: ArenaRoomHandle = roomHandle(null, { status: "connecting" });
const useArenaRoom = vi.fn<(...args: unknown[]) => ArenaRoomHandle>(() => handle);
vi.mock("./use-arena-room", () => ({ useArenaRoom: (...args: unknown[]) => useArenaRoom(...args) }));

let joinResponse: Response = Response.json({ code: "K7P2QX", ticket: "ticket-1", settings: {} });

function stubFetch(signedIn: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/get-session") return Response.json(signedIn ? { user: { id: ME, name: "Minh Anh", email: "m@example.com" }, session: {} } : null);
      if (url === "/api/arena/join") return joinResponse.clone();
      return new Response("{}", { status: 503 });
    }),
  );
}

beforeEach(async () => {
  search = new URLSearchParams("code=K7P2QX");
  handle = roomHandle(null, { status: "connecting" });
  joinResponse = Response.json({ code: "K7P2QX", ticket: "ticket-1", settings: {} });
  useArenaRoom.mockClear();
  await resetStorage();
  await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Minh", placement: "skipped" });
});
afterEach(() => vi.unstubAllGlobals());

describe("the room page", () => {
  it("asks a guest to sign in, staying on the room's link (AC-006)", async () => {
    stubFetch(false);
    render(<ArenaRoomPage />);
    expect(await screen.findByText("Đăng nhập để vào Đấu trường")).toBeInTheDocument();
    expect(useArenaRoom).not.toHaveBeenCalled();
  });

  it("says when the code in the link isn't a room code", async () => {
    search = new URLSearchParams("code=nope");
    stubFetch(true);
    render(<ArenaRoomPage />);
    expect(await screen.findByText("Mã phòng không hợp lệ")).toBeInTheDocument();
  });

  it("gets a ticket and opens the room's socket with it", async () => {
    stubFetch(true);
    render(<ArenaRoomPage />);
    expect(await screen.findByText(/Đang vào phòng K7P2QX/)).toBeInTheDocument();
    await vi.waitFor(() => expect(useArenaRoom).toHaveBeenLastCalledWith("K7P2QX", "ticket-1", expect.anything()));
  });

  it("says why it can't join, in Vietnamese (AC-005)", async () => {
    joinResponse = Response.json({ error: { message: "Phòng đã đủ người." } }, { status: 409 });
    stubFetch(true);
    render(<ArenaRoomPage />);
    expect(await screen.findByText("Không vào được phòng")).toBeInTheDocument();
    expect(screen.getByText("Phòng đã đủ người.")).toBeInTheDocument();
  });

  it("shows the lobby with the room's settings once the room answers", async () => {
    handle = roomHandle(publicRoom({ players: [player(ME)], settings: { mode: "write", level: "B1", rounds: 1 } }));
    stubFetch(true);
    render(<ArenaRoomPage />);
    expect(await screen.findByText("Viết câu · B1 · 1 hiệp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rời phòng/ })).toBeInTheDocument();
    expect(screen.getByText(/Đang chờ đối thủ/)).toBeInTheDocument();
  });

  it("offers Đổi cài đặt to the creator only, and only before the match (AC-031)", async () => {
    handle = roomHandle(publicRoom({ phase: "ready", players: [player(ME), player(RIVAL)], deadline: Date.now() + 30_000 }));
    stubFetch(true);
    const { unmount } = render(<ArenaRoomPage />);
    expect(await screen.findByRole("button", { name: /Đổi cài đặt/ })).toBeInTheDocument();
    unmount();

    handle = roomHandle(publicRoom({ creatorId: RIVAL, phase: "ready", players: [player(RIVAL), player(ME)], deadline: Date.now() + 30_000 }));
    const opponent = render(<ArenaRoomPage />);
    expect(await screen.findByText("Hỗn hợp · A1 · 3 hiệp")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Đổi cài đặt/ })).not.toBeInTheDocument();
    opponent.unmount();

    handle = roomHandle(publicRoom({ phase: "match-end", players: [player(ME), player(RIVAL)], winnerId: ME, endReason: "won" }));
    render(<ArenaRoomPage />);
    expect(await screen.findByText("Hỗn hợp · A1 · 3 hiệp")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Đổi cài đặt/ })).not.toBeInTheDocument();
  });

  it("tells a spectator they're watching, lets them leave mid-match, and shows everyone the watcher count (feature 026)", async () => {
    const watching = publicRoom({
      creatorId: RIVAL,
      phase: "round-end",
      round: 1,
      players: [player(RIVAL), player("khoa", { name: "Khoa" })],
      spectators: [{ id: ME, name: "Minh Anh" }, { id: "an", name: "An" }],
      rounds: [{ round: 1, scores: { [RIVAL]: 7, khoa: 5 }, winnerId: RIVAL }],
      deadline: Date.now() + 5_000,
    });
    handle = roomHandle(watching);
    stubFetch(true);
    const { unmount } = render(<ArenaRoomPage />);
    expect(await screen.findByText("Bạn đang xem trận đấu")).toBeInTheDocument();
    expect(screen.getByText(/2 người đang xem/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rời phòng/ })).toBeInTheDocument();
    unmount();

    handle = roomHandle(publicRoom({ phase: "lobby", players: [player(ME), player(RIVAL)], spectators: [{ id: "an", name: "An" }] }));
    render(<ArenaRoomPage />);
    expect(await screen.findByText(/1 người đang xem/)).toBeInTheDocument();
    expect(screen.queryByText("Bạn đang xem trận đấu")).not.toBeInTheDocument();
  });

  it("says the room closed when the connection ends without a result", async () => {
    handle = roomHandle(null, { status: "closed", error: "Phòng đang mở ở một tab khác." });
    stubFetch(true);
    render(<ArenaRoomPage />);
    expect(await screen.findByText("Phòng đang mở ở một tab khác.")).toBeInTheDocument();
  });
});
