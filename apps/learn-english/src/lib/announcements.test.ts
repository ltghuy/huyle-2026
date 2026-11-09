import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCEMENTS, ANNOUNCEMENTS_SEEN_KEY, getSeenAnnouncements, markAnnouncementsSeen, resetAnnouncementsForTest, subscribeAnnouncements, unseenIds } from "./announcements";

beforeEach(() => {
  localStorage.clear();
  resetAnnouncementsForTest();
});

afterEach(() => vi.unstubAllGlobals());

describe("announcements (034)", () => {
  it("lists the AI grading announcement, newest first, with unique ids", () => {
    expect(ANNOUNCEMENTS[0]).toMatchObject({ id: "2026-11-ai-grading", topic: "ai-grading" });
    expect(new Set(ANNOUNCEMENTS.map((a) => a.id)).size).toBe(ANNOUNCEMENTS.length);
    expect(ANNOUNCEMENTS.map((a) => a.publishedAt)).toEqual(ANNOUNCEMENTS.map((a) => a.publishedAt).toSorted((a, b) => b - a));
  });

  it("is unread until marked, then read on this device (AC-009)", () => {
    const listener = vi.fn();
    subscribeAnnouncements(listener);
    expect(unseenIds(getSeenAnnouncements())).toEqual(["2026-11-ai-grading"]);
    markAnnouncementsSeen();
    expect(unseenIds(getSeenAnnouncements())).toEqual([]);
    expect(localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY)).toBe("2026-11-ai-grading");
    markAnnouncementsSeen();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps read announcements for the visit when storage is blocked", () => {
    const fail = () => {
      throw new Error("SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: fail, setItem: fail, removeItem: fail });
    markAnnouncementsSeen();
    expect(unseenIds(getSeenAnnouncements())).toEqual([]);
  });

  it("treats a new announcement as unread even after older ones were read", () => {
    const newer = { ...ANNOUNCEMENTS[0]!, id: "later" };
    expect(unseenIds("2026-11-ai-grading", [newer, ...ANNOUNCEMENTS])).toEqual(["later"]);
  });
});
