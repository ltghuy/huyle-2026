import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { localDate } from "@/learning/attendance";
import { addAttempt } from "@/storage/attempts";
import { addAttendance } from "@/storage/attendance";
import { putCards } from "@/storage/cards";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { makeAttempt, makeCard, resetStorage } from "@/storage/test-utils";
import { AttendanceSummary } from "./attendance-summary";
import { ProgressInsights } from "./progress-insights";
import { calendarWeeks, weekStart } from "./progress-math";

vi.mock("@/hooks/use-content-index", async () => {
  const { buildContentIndex } = await import("@/lib/session/content-index");
  const { grammar, word } = await import("@/learning/exercises/fixtures");
  const index = buildContentIndex([
    word("apple"),
    word("cat"),
    word("big", {}, "A2"),
    grammar("present-simple", []),
    { ...grammar("past-simple", []), level: "A2" },
  ]);
  return { useContentIndex: () => ({ status: "ready", index, version: 1, stale: false, retry: () => {} }) };
});

const TZ = "Asia/Ho_Chi_Minh";
const DAY_MS = 86_400_000;
const daysAgo = (n: number) => localDate(Date.now() - n * DAY_MS, TZ);
const label = (date: string) => `${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}`;

describe("calendar math", () => {
  it("starts weeks on Monday and ends with the week of today", () => {
    expect(weekStart("2026-10-27")).toBe("2026-10-26"); // a Tuesday
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // a Sunday
    const weeks = calendarWeeks(new Set(["2026-10-27"]), "2026-10-27");
    expect(weeks).toHaveLength(12);
    expect(weeks[0][0].date).toBe("2026-08-10");
    expect(weeks[11][1]).toEqual({ date: "2026-10-27", attended: true, future: false });
    expect(weeks[11][2].future).toBe(true);
  });
});

describe("AttendanceSummary", () => {
  beforeEach(async () => {
    await resetStorage();
    await saveProfile({ ...createDefaultProfile(0), timeZone: TZ });
  });

  it("shows points, the current and longest streak and attended days from storage", async () => {
    // Current run: today and the two days before. Older run: five days in a row.
    for (const n of [0, 1, 2, 10, 11, 12, 13, 14]) await addAttendance({ date: daysAgo(n), points: 10, bonus: 0, at: 0 });
    await addAttendance({ date: daysAgo(30), points: 10, bonus: 20, at: 0 });

    render(<AttendanceSummary />);
    const points = await screen.findByText("Tổng điểm");
    expect(points.closest("div")).toHaveTextContent("110");
    expect(screen.getByText("Chuỗi hiện tại").closest("div")).toHaveTextContent("3ngày");
    expect(screen.getByText("Chuỗi dài nhất").closest("div")).toHaveTextContent("5ngày");

    const calendar = screen.getByRole("list", { name: "Các ngày đã học" });
    expect(within(calendar).getByText(`${label(daysAgo(0))}: đã học`)).toBeInTheDocument();
    expect(within(calendar).getByText(`${label(daysAgo(5))}: chưa học`)).toBeInTheDocument();
  });

  it("drops the current streak after a missed day but keeps the longest", async () => {
    for (const n of [2, 3, 4]) await addAttendance({ date: daysAgo(n), points: 10, bonus: 0, at: 0 });
    render(<AttendanceSummary />);
    expect((await screen.findByText("Chuỗi hiện tại")).closest("div")).toHaveTextContent("0ngày");
    expect(screen.getByText("Chuỗi dài nhất").closest("div")).toHaveTextContent("3ngày");
  });
});

describe("ProgressInsights", () => {
  beforeEach(async () => {
    await resetStorage();
    await saveProfile({ ...createDefaultProfile(0), timeZone: TZ });
  });

  it("shows words per level, grammar topics and 30-day accuracy from storage", async () => {
    const now = Date.now();
    await putCards([makeCard("word:apple", now), makeCard("word:big", now), makeCard("word:gone", now), makeCard("grammar:present-simple", now)]);
    await addAttempt(makeAttempt("1", "word:apple", now - DAY_MS));
    await addAttempt(makeAttempt("2", "word:apple", now - DAY_MS, { correct: false }));
    await addAttempt(makeAttempt("3", "word:big", now - 2 * DAY_MS));
    await addAttempt(makeAttempt("4", "word:big", now - 2 * DAY_MS));
    await addAttempt(makeAttempt("5", "word:big", now - 40 * DAY_MS, { correct: false })); // older than 30 days
    await addAttempt(makeAttempt("6", "word:cat", now - DAY_MS, { correct: false, context: "placement" }));

    render(<ProgressInsights />);
    const words = await screen.findByRole("list", { name: "Từ đã học" });
    const [a1, a2] = within(words).getAllByRole("listitem");
    expect(a1).toHaveTextContent("A1");
    expect(a1).toHaveTextContent("1/2 từ");
    expect(a2).toHaveTextContent("1/1 từ");

    const topics = screen.getByRole("list", { name: "Chủ đề ngữ pháp đã học" });
    expect(within(topics).getAllByRole("listitem")[0]).toHaveTextContent("1/1 chủ đề");
    expect(within(topics).getAllByRole("listitem")[1]).toHaveTextContent("0/1 chủ đề");

    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("đúng 3/4 câu")).toBeInTheDocument();
  });
});
