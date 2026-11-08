import { describe, expect, it } from "vitest";
import { lastActive, timeAgo } from "./last-active";

const NOW = new Date(2026, 10, 8, 15, 0).getTime();
const MIN = 60_000;

describe("last active (feature 031, AC-013)", () => {
  it("names each bucket in Vietnamese", () => {
    expect(lastActive(NOW - 20_000, NOW)).toBe("Vừa mới hoạt động");
    expect(lastActive(NOW - 5 * MIN, NOW)).toBe("Hoạt động 5 phút trước");
    expect(lastActive(NOW - 3 * 60 * MIN, NOW)).toBe("Hoạt động 3 giờ trước");
    expect(lastActive(new Date(2026, 10, 7, 20, 0).getTime(), NOW)).toBe("Hoạt động hôm qua");
    expect(lastActive(new Date(2026, 10, 4, 9, 0).getTime(), NOW)).toBe("Hoạt động 4 ngày trước");
    expect(lastActive(new Date(2026, 10, 1, 9, 0).getTime(), NOW)).toBe("Hoạt động 7 ngày trước");
    expect(lastActive(new Date(2026, 9, 31, 9, 0).getTime(), NOW)).toBe("Hoạt động ngày 31/10/2026");
    expect(lastActive(null, NOW)).toBe("Chưa hoạt động gần đây");
  });

  it("keeps minutes across midnight inside the first hour", () => {
    const justAfterMidnight = new Date(2026, 10, 8, 0, 10).getTime();
    expect(timeAgo(new Date(2026, 10, 7, 23, 50).getTime(), justAfterMidnight)).toBe("20 phút trước");
  });

  it("gives short times for notifications (AC-024)", () => {
    expect(timeAgo(NOW - 5 * MIN, NOW)).toBe("5 phút trước");
    expect(timeAgo(new Date(2026, 10, 7, 9, 0).getTime(), NOW)).toBe("hôm qua");
  });
});
