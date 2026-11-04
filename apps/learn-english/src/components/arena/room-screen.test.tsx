import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import ArenaRoomPage from "@/app/(focus)/arena/room/page";
import { ME, player, publicRoom, roomHandle } from "./test-room";
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

  it("says the room closed when the connection ends without a result", async () => {
    handle = roomHandle(null, { status: "closed", error: "Phòng đang mở ở một tab khác." });
    stubFetch(true);
    render(<ArenaRoomPage />);
    expect(await screen.findByText("Phòng đang mở ở một tab khác.")).toBeInTheDocument();
  });
});
