import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { toast } from "sonner";
import { render } from "@/test-utils/render";
import { localDate } from "@/learning/attendance";
import { addAttempt } from "@/storage/attempts";
import { addAttendance } from "@/storage/attendance";
import { putExtraLesson } from "@/storage/extra-lessons";
import { putCards } from "@/storage/cards";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { makeAttempt, makeCard, resetStorage } from "@/storage/test-utils";
import { AttendanceSummary } from "./attendance-summary";
import { ProgressInsights } from "./progress-insights";
import { achievementText, certificateFileName, certificatePng, englishAchievementText, englishDate, vietnameseDate } from "./certificate";
import { calendarWeeks, weekStart } from "./progress-math";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
// jsdom has no canvas: the drawing is replaced by a fixed PNG blob.
vi.mock("./certificate", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./certificate")>()),
  certificatePng: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
}));

vi.mock("@/hooks/use-content-index", async () => {
  const { buildContentIndex } = await import("@/lib/session/content-index");
  const { forms, grammar, word } = await import("@/learning/exercises/fixtures");
  const index = buildContentIndex([
    word("apple"),
    word("cat"),
    word("big", {}, "A2"),
    grammar("present-simple", []),
    { ...grammar("past-simple", []), level: "A2" },
    forms("go", ["went"], ["gone"]),
    forms("eat", ["ate"], ["eaten"]),
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

  it("shows points now and ever earned, the current and longest streak and attended days from storage", async () => {
    // Current run: today and the two days before. Older run: five days in a row.
    for (const n of [0, 1, 2, 10, 11, 12, 13, 14]) await addAttendance({ date: daysAgo(n), points: 10, bonus: 0, at: 0 });
    await addAttendance({ date: daysAgo(30), points: 10, bonus: 20, at: 0 });
    await putExtraLesson({ id: "x", date: daysAgo(1), price: 13, purchasedAt: 0, contentVersion: 1, plan: [], position: { part: 0, index: 0 }, updatedAt: 0 });

    render(<AttendanceSummary />);
    expect((await screen.findByText("Tổng điểm đã nhận")).closest("div")).toHaveTextContent("110");
    expect(screen.getByText("Điểm hiện có").closest("div")).toHaveTextContent("97");
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

  it("counts irregular verbs whose forms were practised, apart from words (008 AC-016)", async () => {
    await putCards([makeCard("forms:go", Date.now()), makeCard("word:eat", Date.now())]);
    render(<ProgressInsights />);
    const list = await screen.findByRole("list", { name: "Động từ bất quy tắc đã học" });
    expect(list).toHaveTextContent("1/2 động từ");
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

describe("certificate text (009 AC-004, AC-006)", () => {
  it("names what was finished, the file and the date in Vietnamese", () => {
    expect(achievementText("word", "A1", 1164)).toBe("1.164 từ vựng trình độ A1");
    expect(achievementText("grammar", "A1", 12)).toBe("12 chủ điểm ngữ pháp trình độ A1");
    expect(achievementText("forms", "C1", 3)).toBe("3 động từ bất quy tắc trình độ C1");
    expect(certificateFileName("forms", "C1")).toBe("chung-nhan-dong-tu-bat-quy-tac-C1.png");
    expect(vietnameseDate("2026-10-28")).toBe("ngày 28 tháng 10 năm 2026");
  });
});

describe("certificate image text (009 AC-004)", () => {
  it("names what was finished and the date in English", () => {
    expect(englishAchievementText("word", "A1", 1164)).toBe("1,164 words at level A1");
    expect(englishAchievementText("grammar", "A1", 1)).toBe("1 grammar topic at level A1");
    expect(englishAchievementText("forms", "C1", 3)).toBe("3 irregular verbs at level C1");
    expect(englishDate("2026-10-28")).toBe("October 28, 2026");
  });
});

describe("progress certificates (009)", () => {
  const learnedAt = Date.UTC(2026, 9, 27, 12); // 27 October 2026, 19:00 in Vietnam

  beforeEach(async () => {
    await resetStorage();
    await saveProfile({ ...createDefaultProfile(0), timeZone: TZ, displayName: "Minh Anh" });
    vi.mocked(toast).mockClear();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:certificate"), revokeObjectURL: vi.fn() }));
  });

  it("locks every unfinished row and says how much is left (AC-001, AC-002, AC-005)", async () => {
    await putCards([makeCard("word:apple", 0, { addedAt: learnedAt })]);
    render(<ProgressInsights />);
    const words = await screen.findByRole("list", { name: "Từ đã học" });
    const locked = within(words).getByRole("button", { name: "Chứng nhận từ vựng A1: chưa đạt, còn 1 từ" });
    fireEvent.click(locked);
    expect(toast).toHaveBeenCalledWith("Còn 1 từ nữa là bạn nhận chứng nhận từ vựng A1.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a finished row's certificate with the name and date, and saves it as a PNG (AC-003, AC-004, AC-006)", async () => {
    await putCards([makeCard("forms:go", 0, { addedAt: learnedAt - DAY_MS }), makeCard("forms:eat", 0, { addedAt: learnedAt })]);
    render(<ProgressInsights />);
    const verbs = await screen.findByRole("list", { name: "Động từ bất quy tắc đã học" });
    fireEvent.click(within(verbs).getByRole("button", { name: "Xem chứng nhận động từ bất quy tắc A1" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Bạn đã học xong 2 động từ bất quy tắc trình độ A1.")).toBeInTheDocument();
    const image = await within(dialog).findByRole("img");
    expect(image).toHaveAttribute("alt", "Chứng nhận Minh Anh đã học xong 2 động từ bất quy tắc trình độ A1, ngày 27 tháng 10 năm 2026, English with Evan.");
    expect(vi.mocked(certificatePng)).toHaveBeenLastCalledWith({ kind: "forms", level: "A1", total: 2, name: "Minh Anh", date: "2026-10-27" });

    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    fireEvent.click(within(dialog).getByRole("button", { name: "Tải về" }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0]).toHaveProperty("download", "chung-nhan-dong-tu-bat-quy-tac-A1.png");
    click.mockRestore();
  });
});
