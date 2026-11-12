import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import type { CommunityRoom } from "@/server/arena/arena.schema";
import { CommunityList } from "./community-list";

const push = vi.fn();
vi.mock("next/navigation", async () => ({
  ...(await import("@/components/library/test-navigation")),
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status: "signed-in", account: { userId: "minh", name: "Minh Anh", email: "minh@example.com", image: null } }),
  canUseLockedAreas: () => true,
}));
vi.mock("@/hooks/use-profile", () => ({ useProfile: () => ({ status: "ready", data: { level: "A2" } }) }));

const fetchCommunity = vi.fn();
const joinRoom = vi.fn();
vi.mock("@/lib/arena-client", async (original) => ({
  ...(await original<typeof import("@/lib/arena-client")>()),
  fetchCommunity: (...args: unknown[]) => fetchCommunity(...args),
  joinRoom: (...args: unknown[]) => joinRoom(...args),
}));
const { ArenaError } = await import("@/lib/arena-client");

const LAN_DUEL: CommunityRoom = {
  kind: "duel",
  code: "K7P2QX",
  settings: { mode: "listen", level: "A2", rounds: 3, seconds: 15 },
  host: { id: "lan", name: "Lan", image: null },
  taken: 1,
  seats: 2,
  updatedAt: 2,
};
const KHOA_TEAM: CommunityRoom = {
  kind: "team",
  code: "TEAM22",
  settings: { mode: "mixed", level: "A2", rounds: 1, seconds: 25, size: 6, minutes: 10 },
  host: { id: "khoa", name: "Khoa", image: null },
  taken: 3,
  seats: 6,
  updatedAt: 1,
};
const MY_ROOM: CommunityRoom = { ...LAN_DUEL, code: "MINE22", host: { id: "minh", name: "Minh Anh", image: null } };

function visit(search = "") {
  window.history.replaceState(null, "", `/arena/community${search}`);
  render(<CommunityList />);
}

const rows = () => within(screen.getByRole("list", { name: "Phòng đang chờ" })).getAllByRole("listitem");

beforeEach(() => {
  push.mockReset();
  joinRoom.mockReset();
  fetchCommunity.mockReset().mockResolvedValue({ rooms: [LAN_DUEL, KHOA_TEAM] });
});

afterEach(() => vi.restoreAllMocks());

describe("CommunityList (feature 041)", () => {
  it("lists each room with its host, kind, settings and seats, at the learner's level (AC-007, AC-008)", async () => {
    visit();
    await screen.findByRole("list", { name: "Phòng đang chờ" });
    expect(fetchCommunity).toHaveBeenCalledWith({ kind: undefined, level: "A2" });
    const [duel, team] = rows();
    expect(duel).toHaveTextContent("Lan");
    expect(duel).toHaveTextContent("Đấu 1-1");
    expect(duel).toHaveTextContent("A2 · 3 hiệp · 15 giây/câu");
    expect(within(duel).getByLabelText("1 trên 2 chỗ đã có người")).toHaveTextContent("1/2");
    expect(team).toHaveTextContent("Khoa");
    expect(team).toHaveTextContent("Đấu đội");
    expect(team).toHaveTextContent("10 phút/hiệp");
    expect(within(team).getByLabelText("3 trên 6 chỗ đã có người")).toBeInTheDocument();
  });

  it("filters by kind and level through the URL (AC-008)", async () => {
    visit();
    await screen.findByRole("list", { name: "Phòng đang chờ" });
    fireEvent.click(screen.getByRole("button", { name: "Đấu đội" }));
    expect(window.location.search).toBe("?kind=team");
    await waitFor(() => expect(fetchCommunity).toHaveBeenLastCalledWith({ kind: "team", level: "A2" }));
    window.history.replaceState(null, "", "/arena/community?kind=team&level=all");
    await waitFor(() => expect(fetchCommunity).toHaveBeenLastCalledWith({ kind: "team", level: undefined }));
  });

  it("loads again only on Làm mới (AC-009)", async () => {
    visit();
    await screen.findByRole("list", { name: "Phòng đang chờ" });
    expect(fetchCommunity).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("focus"));
    expect(fetchCommunity).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Làm mới" }));
    await waitFor(() => expect(fetchCommunity).toHaveBeenCalledTimes(2));
  });

  it("joins a room for a seat only and opens it (AC-010)", async () => {
    joinRoom.mockResolvedValue({ kind: "duel", code: "K7P2QX", ticket: "t", settings: LAN_DUEL.settings });
    visit();
    fireEvent.click(await screen.findByRole("button", { name: "Vào phòng của Lan" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/arena/room?code=K7P2QX"));
    expect(joinRoom).toHaveBeenCalledWith("K7P2QX", undefined, { seatOnly: true });
  });

  it("says why a room can't be joined any more and reloads the list (AC-011)", async () => {
    joinRoom.mockRejectedValue(new ArenaError("Phòng đã đủ người.", 409));
    visit();
    fireEvent.click(await screen.findByRole("button", { name: "Vào phòng của Lan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Phòng của Lan: Phòng đã đủ người.");
    await waitFor(() => expect(fetchCommunity).toHaveBeenCalledTimes(2));
    expect(push).not.toHaveBeenCalled();
  });

  it("marks the learner's own room (AC-012)", async () => {
    fetchCommunity.mockResolvedValue({ rooms: [MY_ROOM] });
    visit();
    const row = (await screen.findAllByRole("listitem"))[0];
    expect(row).toHaveTextContent("Phòng của bạn");
    expect(within(row).getByRole("button", { name: "Quay lại phòng của Minh Anh" })).toBeInTheDocument();
  });

  it("offers to create a room when nobody is waiting, and to clear the filters (AC-013)", async () => {
    fetchCommunity.mockResolvedValue({ rooms: [] });
    visit("?kind=duel&level=B1");
    expect(await screen.findByText("Không có phòng nào khớp bộ lọc")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tạo phòng 1-1" })).toHaveAttribute("href", "/arena/1v1");
    expect(screen.getByRole("link", { name: "Tạo phòng đội" })).toHaveAttribute("href", "/arena/team");
    fireEvent.click(screen.getByRole("button", { name: "Bỏ lọc" }));
    expect(window.location.search).toBe("?level=all");
    expect(await screen.findByText("Chưa có phòng nào đang chờ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bỏ lọc" })).not.toBeInTheDocument();
  });

  it("shows the load error with a retry", async () => {
    fetchCommunity.mockRejectedValue(new ArenaError("Đấu trường đang tạm nghỉ, bạn thử lại sau nhé.", 503));
    visit();
    expect(await screen.findByRole("button", { name: /Thử lại/ })).toBeInTheDocument();
  });
});
