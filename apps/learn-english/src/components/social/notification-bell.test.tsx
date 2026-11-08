import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialError } from "@/lib/social-client";
import type { NotificationsResponse, PulseResponse } from "@/server/social/social.schema";
import { render } from "@/test-utils/render";
import { badgeText, NotificationBell } from "./notification-bell";

let status = "signed-in";
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status, account: status === "signed-in" ? { userId: "lan", name: "Lan", email: "l@example.com", image: null } : null }),
}));
const pulse = vi.fn<() => Promise<PulseResponse>>();
const fetchNotifications = vi.fn<() => Promise<NotificationsResponse>>();
const markNotificationsRead = vi.fn();
const respondToRequest = vi.fn();
vi.mock("@/lib/social-client", async (original) => ({
  ...(await original<typeof import("@/lib/social-client")>()),
  pulse: () => pulse(),
  fetchNotifications: () => fetchNotifications(),
  markNotificationsRead: () => markNotificationsRead(),
  respondToRequest: (id: string, accept: boolean) => respondToRequest(id, accept),
}));

const NOW = new Date(2026, 10, 8, 15, 0).getTime();
const pulseData = (unread: number): PulseResponse => ({ now: NOW, friends: [], outgoing: [], incoming: ["minh"], unread });
const REQUEST = { id: "n1", kind: "friend_request" as const, actor: { id: "minh", name: "Minh Anh", image: null }, createdAt: NOW - 5 * 60_000, read: false, pending: true };
const ACCEPTED = { id: "n0", kind: "friend_accepted" as const, actor: { id: "khoa", name: "Khoa", image: null }, createdAt: NOW - 86_400_000, read: true, pending: false };

beforeEach(() => {
  status = "signed-in";
  pulse.mockReset().mockResolvedValue(pulseData(1));
  fetchNotifications.mockReset().mockResolvedValue({ now: NOW, items: [REQUEST, ACCEPTED] });
  markNotificationsRead.mockReset().mockResolvedValue(undefined);
  respondToRequest.mockReset();
});

async function openBell() {
  fireEvent.click(await screen.findByRole("button", { name: /^Thông báo/ }));
  return screen.findByRole("dialog");
}

describe("NotificationBell (feature 031)", () => {
  it("shows the unread count on the bell, 9+ above nine (AC-022, AC-023)", async () => {
    render(<NotificationBell />);
    expect(await screen.findByRole("button", { name: "Thông báo, 1 chưa đọc" })).toHaveTextContent("1");
    expect(badgeText(9)).toBe("9");
    expect(badgeText(12)).toBe("9+");
  });

  it("lists notifications newest first with times, and marks them read on open (AC-004, AC-024, AC-026)", async () => {
    render(<NotificationBell />);
    const dialog = await openBell();
    const rows = await within(dialog).findAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Minh Anh muốn kết bạn với bạn");
    expect(rows[0]).toHaveTextContent("5 phút trước");
    expect(within(rows[0]).getByLabelText("Chưa đọc")).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("Khoa đã đồng ý kết bạn");
    expect(rows[1]).toHaveTextContent("hôm qua");
    await waitFor(() => expect(markNotificationsRead).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "Thông báo" })).toBeInTheDocument());
  });

  it("accepts a request from the bell (AC-005)", async () => {
    respondToRequest.mockResolvedValue({ state: "friends" });
    render(<NotificationBell />);
    const dialog = await openBell();
    fireEvent.click(await within(dialog).findByRole("button", { name: "Đồng ý" }));
    expect(await within(dialog).findByText(/đã là bạn bè/)).toBeInTheDocument();
    expect(respondToRequest).toHaveBeenCalledWith("minh", true);
    expect(within(dialog).queryByRole("button", { name: "Đồng ý" })).not.toBeInTheDocument();
  });

  it("declining removes the request (AC-006)", async () => {
    respondToRequest.mockResolvedValue({ state: "declined" });
    render(<NotificationBell />);
    const dialog = await openBell();
    fireEvent.click(await within(dialog).findByRole("button", { name: "Từ chối" }));
    await waitFor(() => expect(within(dialog).queryByText(/muốn kết bạn/)).not.toBeInTheDocument());
    expect(respondToRequest).toHaveBeenCalledWith("minh", false);
  });

  it("says the request is gone when it no longer waits (AC-029)", async () => {
    respondToRequest.mockRejectedValue(new SocialError("Lời mời này không còn nữa.", 404));
    render(<NotificationBell />);
    const dialog = await openBell();
    fireEvent.click(await within(dialog).findByRole("button", { name: "Đồng ý" }));
    expect(await within(dialog).findByText("Lời mời này không còn nữa.")).toBeInTheDocument();
  });

  it("says when there is nothing yet (AC-025)", async () => {
    pulse.mockResolvedValue(pulseData(0));
    fetchNotifications.mockResolvedValue({ now: NOW, items: [] });
    render(<NotificationBell />);
    const dialog = await openBell();
    expect(await within(dialog).findByText("Chưa có thông báo nào.")).toBeInTheDocument();
    expect(markNotificationsRead).not.toHaveBeenCalled();
  });

  it("is absent for guests (AC-030)", () => {
    status = "guest";
    render(<NotificationBell />);
    expect(screen.queryByRole("button", { name: /Thông báo/ })).not.toBeInTheDocument();
  });
});
