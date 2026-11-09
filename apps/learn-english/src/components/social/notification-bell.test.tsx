import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCEMENTS_SEEN_KEY, markAnnouncementsSeen, resetAnnouncementsForTest } from "@/lib/announcements";
import { AI_KEYS_KEY, resetAiKeysForTest } from "@/lib/ai-keys";
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
  localStorage.clear();
  resetAnnouncementsForTest();
  resetAiKeysForTest();
  // The feature 031 tests are about personal notifications: the announcements are already read.
  markAnnouncementsSeen();
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

describe("NotificationBell tabs (feature 034)", () => {
  beforeEach(() => {
    localStorage.removeItem(ANNOUNCEMENTS_SEEN_KEY);
    resetAnnouncementsForTest();
  });

  it("counts unread announcements on the bell and in the tab, and opens on Cá nhân while it has unread items (AC-001, AC-003, AC-004)", async () => {
    render(<NotificationBell />);
    expect(await screen.findByRole("button", { name: "Thông báo, 2 chưa đọc" })).toHaveTextContent("2");
    const dialog = await openBell();
    expect(within(dialog).getByRole("tab", { name: /Cá nhân/ })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByRole("tab", { name: /Hệ thống/ })).toHaveTextContent("1");
    expect(await within(dialog).findByText("Minh Anh")).toBeInTheDocument();
    expect(localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY)).toBeNull();
  });

  it("opens on Hệ thống when only it has something unread, shows the AI announcement and counts it read (AC-003, AC-006, AC-007, AC-009)", async () => {
    pulse.mockResolvedValue(pulseData(0));
    render(<NotificationBell />);
    expect(await screen.findByRole("button", { name: "Thông báo, 1 chưa đọc" })).toBeInTheDocument();
    const dialog = await openBell();
    expect(within(dialog).getByRole("tab", { name: /Hệ thống/ })).toHaveAttribute("aria-selected", "true");
    const row = within(dialog).getByRole("listitem");
    expect(row).toHaveTextContent("Mới: chấm bài “Dịch câu” bằng AI");
    expect(row).toHaveTextContent("Google AI Studio");
    expect(within(row).getByLabelText("Chưa đọc")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Thêm khóa trong Cài đặt" })).toHaveAttribute("href", "/settings#cham-bang-ai");
    expect(localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY)).toBe("2026-11-ai-grading");
    await waitFor(() => expect(screen.getByRole("button", { name: "Thông báo" })).toBeInTheDocument());
  });

  it("marks announcements read when the learner switches to Hệ thống (AC-009)", async () => {
    render(<NotificationBell />);
    await screen.findByRole("button", { name: "Thông báo, 2 chưa đọc" });
    const dialog = await openBell();
    fireEvent.click(within(dialog).getByRole("tab", { name: /Hệ thống/ }));
    expect(await within(dialog).findByText("Mới: chấm bài “Dịch câu” bằng AI")).toBeInTheDocument();
    expect(localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY)).toBe("2026-11-ai-grading");
  });

  it("says AI grading is on when the learner already has a key (AC-008)", async () => {
    localStorage.setItem(AI_KEYS_KEY, JSON.stringify([{ id: "k", key: "AIza-key", status: "working" }]));
    pulse.mockResolvedValue(pulseData(0));
    render(<NotificationBell />);
    const dialog = await openBell();
    expect(within(dialog).getByText("Bạn đã bật chấm điểm bằng AI.")).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: "Thêm khóa trong Cài đặt" })).not.toBeInTheDocument();
  });

  it("still shows Hệ thống when the friend notifications fail to load", async () => {
    fetchNotifications.mockRejectedValue(new Error("offline"));
    render(<NotificationBell />);
    await screen.findByRole("button", { name: "Thông báo, 2 chưa đọc" });
    const dialog = await openBell();
    expect(await within(dialog).findByText("Không tải được thông báo.")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("tab", { name: /Hệ thống/ }));
    expect(await within(dialog).findByText("Mới: chấm bài “Dịch câu” bằng AI")).toBeInTheDocument();
  });

  it("stays hidden for guests (AC-005)", () => {
    status = "guest";
    render(<NotificationBell />);
    expect(screen.queryByRole("button", { name: /Thông báo/ })).not.toBeInTheDocument();
  });
});
