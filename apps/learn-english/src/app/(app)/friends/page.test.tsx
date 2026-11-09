import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import FriendsPage, { metadata } from "./page";

let status = "signed-in";
const pulse = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/friends", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/use-account", async (original) => ({
  ...(await original<typeof import("@/hooks/use-account")>()),
  useAccount: () => ({ status, account: status === "signed-in" ? { userId: "minh", name: "Minh Anh", email: "m@example.com", image: null } : null }),
}));
vi.mock("@/lib/social-client", async (original) => ({
  ...(await original<typeof import("@/lib/social-client")>()),
  pulse: () => pulse(),
}));

beforeEach(() => {
  status = "signed-in";
  pulse.mockReset();
  pulse.mockResolvedValue({ now: 1, friends: [{ id: "lan", name: "Lan", image: null, online: true, lastSeenAt: 1 }], outgoing: [], incoming: [], unread: 0 });
});

describe("/friends (feature 032)", () => {
  it("shows the friends list with the online count to signed-in learners (AC-002)", async () => {
    render(<FriendsPage />);
    expect(await screen.findByText("Lan")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Bạn bè" })).toBeInTheDocument();
    expect(screen.getByText("1/1 đang trực tuyến")).toBeInTheDocument();
    // A thumb-sized menu button on this page.
    expect(screen.getByRole("button", { name: "Tùy chọn cho Lan" })).toHaveClass("size-11");
  });

  it("asks guests to sign in and sends no pulse (AC-003)", async () => {
    status = "guest";
    render(<FriendsPage />);
    await waitFor(() => expect(screen.getByText("Đăng nhập để xem bạn bè")).toBeInTheDocument());
    expect(screen.queryByRole("region", { name: "Bạn bè" })).not.toBeInTheDocument();
    expect(pulse).not.toHaveBeenCalled();
  });

  it("is noindex (AC-005)", () => {
    expect(metadata.robots).toMatchObject({ index: false });
  });
});
