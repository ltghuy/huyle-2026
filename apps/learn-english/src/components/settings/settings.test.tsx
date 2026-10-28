import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { buildSnapshot, parseSnapshot } from "@/learning/snapshot";
import type { Profile } from "@/learning/types";
import { addAttempt, getAllAttempts } from "@/storage/attempts";
import { addAttendance, getAllAttendance } from "@/storage/attendance";
import { getAllCards, putCards } from "@/storage/cards";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { makeAttempt, makeCard, resetStorage } from "@/storage/test-utils";
import { needsBackupReminder } from "./backup-actions";
import { BackupPanel } from "./backup-panel";
import { BackupReminder } from "./backup-reminder";

const DAY_MS = 86_400_000;
const LOCAL_SYNC = { code: "secret", rev: 3, dirty: false };

async function seedLocal() {
  await saveProfile({ ...createDefaultProfile(0, () => "local-device"), level: "B1", sync: LOCAL_SYNC });
  await putCards([makeCard("word:local", 0)]);
  await addAttempt(makeAttempt("local-1", "word:local", Date.now()));
  await addAttendance({ date: "2026-10-20", points: 10, bonus: 0, at: 0 });
}

let blobs: Blob[] = [];

beforeEach(async () => {
  await resetStorage();
  blobs = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return "blob:test";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function fileInput() {
  return screen.getByLabelText("Chọn file sao lưu") as HTMLInputElement;
}

async function pickFile(contents: string) {
  const input = fileInput();
  Object.defineProperty(input, "files", { configurable: true, value: [new File([contents], "backup.json", { type: "application/json" })] });
  await act(async () => fireEvent.change(input));
}

describe("BackupPanel", () => {
  it("exports a parseable snapshot named by date and stamps the backup time", async () => {
    await seedLocal();
    render(<BackupPanel />);
    const clickSpy = vi.mocked(HTMLAnchorElement.prototype.click);

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Xuất tiến độ" })));
    await waitFor(() => expect(blobs).toHaveLength(1));

    const parsed = parseSnapshot(await blobs[0].text());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.snapshot.summary).toMatchObject({ wordsLearned: 1, points: 10 });
    expect(parsed.snapshot.data.meta).not.toHaveProperty("deviceId");
    expect(parsed.snapshot.data.meta).not.toHaveProperty("sync");
    expect((clickSpy.mock.contexts[0] as HTMLAnchorElement).download).toMatch(/^learn-english-\d{4}-\d{2}-\d{2}\.json$/);
    await waitFor(async () => expect((await getProfile())?.lastBackupAt).toBeTypeOf("number"));
  });

  it("rejects a damaged file with a Vietnamese error and changes nothing", async () => {
    await seedLocal();
    render(<BackupPanel />);
    await pickFile('{"app":"learn-english","version":1,"data":');
    expect(await screen.findByRole("alert")).toHaveTextContent("File này bị hỏng hoặc không đọc được");

    await pickFile('{"hello":"world"}');
    expect(await screen.findByRole("alert")).toHaveTextContent("Đây không phải file sao lưu");

    await pickFile('{"app":"learn-english","version":99}');
    expect(await screen.findByRole("alert")).toHaveTextContent("phiên bản mới hơn");

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect((await getAllCards()).map((card) => card.itemId)).toEqual(["word:local"]);
    expect((await getProfile())?.level).toBe("B1");
  });

  it("imports a valid snapshot after confirmation, replacing progress but keeping this device's id and sync", async () => {
    await seedLocal();
    const now = Date.now();
    const other: Profile = { ...createDefaultProfile(now - 5 * DAY_MS, () => "other-device"), displayName: "Gia Huy", level: "A2", tourSeen: true };
    const snapshot = buildSnapshot(
      {
        profile: other,
        cards: [makeCard("word:apple", now), makeCard("word:cat", now)],
        attempts: [makeAttempt("other-1", "word:apple", now)],
        lessons: [],
        attendance: [{ date: "2026-10-25", points: 10, bonus: 0, at: now }],
      },
      now,
      other.timeZone,
    );

    render(<BackupPanel />);
    await pickFile(JSON.stringify(snapshot));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Nhập file sao lưu này?");
    expect(within(dialog).getByText("Từ đã học").nextElementSibling).toHaveTextContent("2");
    expect(within(dialog).getByText("Điểm").nextElementSibling).toHaveTextContent("10");
    // Nothing changes until the learner confirms.
    expect((await getAllCards()).map((card) => card.itemId)).toEqual(["word:local"]);

    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Thay tiến độ" })));
    await waitFor(async () => expect((await getAllCards()).map((card) => card.itemId)).toEqual(["word:apple", "word:cat"]));
    expect((await getAllAttempts()).map((attempt) => attempt.id)).toEqual(["other-1"]);
    expect((await getAllAttendance()).map((row) => row.date)).toEqual(["2026-10-25"]);
    expect(await getProfile()).toMatchObject({ displayName: "Gia Huy", level: "A2", tourSeen: true, deviceId: "local-device", sync: LOCAL_SYNC });
  });

  it("resets all progress after confirmation", async () => {
    await seedLocal();
    render(<BackupPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại tiến độ" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("xuất tiến độ ra file trước");

    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Xóa hết" })));
    await waitFor(async () => expect(await getAllCards()).toEqual([]));
    expect(await getAllAttempts()).toEqual([]);
    expect(await getAllAttendance()).toEqual([]);
    expect(await getProfile()).toMatchObject({ level: "A1", placement: "pending" });
  });
});

describe("backup reminder", () => {
  const now = 100 * DAY_MS;
  const profile = (extra: Partial<Profile>) => ({ ...createDefaultProfile(now - 20 * DAY_MS), ...extra });

  it("reminds after 14 days without a backup when there is progress and sync is off", () => {
    expect(needsBackupReminder(profile({}), 1, now)).toBe(true);
    expect(needsBackupReminder(profile({ lastBackupAt: now - 15 * DAY_MS }), 1, now)).toBe(true);
    expect(needsBackupReminder(profile({ lastBackupAt: now - 3 * DAY_MS }), 1, now)).toBe(false);
    expect(needsBackupReminder(profile({}), 0, now)).toBe(false);
    expect(needsBackupReminder(profile({ sync: LOCAL_SYNC }), 1, now)).toBe(false);
    expect(needsBackupReminder(profile({ createdAt: now - DAY_MS }), 1, now)).toBe(false);
  });

  it("shows a dismissible banner", async () => {
    await saveProfile(createDefaultProfile(Date.now() - 20 * DAY_MS));
    await putCards([makeCard("word:apple", 0)]);
    render(<BackupReminder />);
    expect(await screen.findByText(/chưa sao lưu tiến độ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ẩn lời nhắc" }));
    expect(screen.queryByText(/chưa sao lưu tiến độ/)).not.toBeInTheDocument();
  });
});
