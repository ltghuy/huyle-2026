import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PulseResponse } from "@/server/social/social.schema";
import { render } from "@/test-utils/render";
import { FriendsList } from "./friends-list";

let status = "signed-in";
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status, account: status === "signed-in" ? { userId: "minh", name: "Minh Anh", email: "m@example.com", image: null } : null }),
}));
const pulse = vi.fn<() => Promise<PulseResponse>>();
const removeFriend = vi.fn();
vi.mock("@/lib/social-client", async (original) => ({
  ...(await original<typeof import("@/lib/social-client")>()),
  pulse: () => pulse(),
  removeFriend: (id: string) => removeFriend(id),
}));

const NOW = new Date(2026, 10, 8, 15, 0).getTime();
const friend = (id: string, name: string, online: boolean, lastSeenAt: number | null) => ({ id, name, image: null, online, lastSeenAt });
const DATA: PulseResponse = {
  now: NOW,
  friends: [friend("khoa", "Khoa", false, NOW - 5 * 60_000), friend("lan", "Lan", true, NOW - 30_000), friend("hoa", "Hoa", false, null)],
  outgoing: [],
  incoming: [],
  unread: 0,
};

beforeEach(() => {
  status = "signed-in";
  pulse.mockReset();
  removeFriend.mockReset();
});

describe("FriendsList (feature 031)", () => {
  it("lists online friends first with the count and each status (AC-010, AC-012 to AC-014)", async () => {
    pulse.mockResolvedValue(DATA);
    render(<FriendsList />);
    const list = await screen.findByRole("list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("LanĐang trực tuyến"),
      expect.stringContaining("KhoaHoạt động 5 phút trước"),
      expect.stringContaining("HoaChưa hoạt động gần đây"),
    ]);
    expect(screen.getByText("1/3 đang trực tuyến")).toBeInTheDocument();
  });

  it("shows the empty card without a link (AC-016)", async () => {
    pulse.mockResolvedValue({ ...DATA, friends: [] });
    render(<FriendsList />);
    expect(await screen.findByText("Bạn chưa có bạn bè nào.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows nothing to guests and sends no pulse (AC-018)", () => {
    status = "guest";
    const { container } = render(<FriendsList />);
    expect(container).toBeEmptyDOMElement();
    expect(pulse).not.toHaveBeenCalled();
  });

  it("offers a retry when the list can't load", async () => {
    pulse.mockRejectedValueOnce(new Error("down")).mockResolvedValue(DATA);
    render(<FriendsList />);
    expect(await screen.findByText("Không tải được danh sách bạn bè.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Lan")).toBeInTheDocument();
  });

  it("removes a friend after confirming (AC-019, AC-020)", async () => {
    pulse.mockResolvedValue(DATA);
    removeFriend.mockResolvedValue(undefined);
    render(<FriendsList />);
    fireEvent.click(await screen.findByRole("button", { name: "Tùy chọn cho Lan" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Xóa bạn" }));
    expect(await screen.findByText("Xóa Lan khỏi bạn bè?")).toBeInTheDocument();
    pulse.mockResolvedValue({ ...DATA, friends: DATA.friends.filter((f) => f.id !== "lan") });
    fireEvent.click(screen.getByRole("button", { name: "Xóa bạn" }));
    await waitFor(() => expect(removeFriend).toHaveBeenCalledWith("lan"));
    await waitFor(() => expect(screen.queryByText("Lan")).not.toBeInTheDocument());
  });
});
