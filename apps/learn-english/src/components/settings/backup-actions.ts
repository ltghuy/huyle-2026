import { localDate } from "@/learning/attendance";
import { buildSnapshot, parseSnapshot, type ParseResult, type Snapshot } from "@/learning/snapshot";
import type { Profile } from "@/learning/types";
import { getProfile, updateProfile } from "@/storage/meta";
import { readLearnerState, replaceAll } from "@/storage/replace";

const DAY_MS = 86_400_000;
export const BACKUP_REMINDER_DAYS = 14;

export const IMPORT_ERRORS: Record<Extract<ParseResult, { ok: false }>["reason"], string> = {
  invalid: "File này bị hỏng hoặc không đọc được. Tiến độ hiện tại của bạn vẫn giữ nguyên.",
  "newer-version": "File này được tạo bởi phiên bản mới hơn của ứng dụng. Bạn hãy tải lại trang rồi thử nhập lại nhé.",
  "not-a-backup": "Đây không phải file sao lưu của Learn English. Bạn hãy chọn file learn-english-….json đã xuất trước đó.",
};

/** Downloads the backup file (AC-042) and stamps `lastBackupAt`. */
export async function exportProgress(now: number): Promise<void> {
  const state = await readLearnerState(now);
  const { timeZone } = state.profile;
  const snapshot = buildSnapshot(state, now, timeZone);
  const blob = new Blob([JSON.stringify(snapshot)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `learn-english-${localDate(now, timeZone)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next task, after the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  await updateProfile({ lastBackupAt: now }, now);
}

/** Reads and validates a picked backup file; never throws. */
export async function readBackupFile(file: Blob): Promise<ParseResult> {
  try {
    return parseSnapshot(await file.text());
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/**
 * Replaces all progress with the snapshot (AC-043). This browser keeps its own
 * `deviceId` and sync link, which never travel in a backup.
 */
export async function applySnapshot(snapshot: Snapshot): Promise<void> {
  const local = await getProfile();
  const profile: Profile = { ...snapshot.data.meta, deviceId: local?.deviceId ?? crypto.randomUUID() };
  if (local?.sync) profile.sync = local.sync;
  const { cards, attempts, lessons, attendance } = snapshot.data;
  await replaceAll({ profile, cards, attempts, lessons, attendance });
}

/**
 * The gentle 14-day reminder: there is progress worth keeping, sync is off,
 * and no backup was made in the last 14 days (counted from the first visit
 * when there has never been one).
 */
export function needsBackupReminder(profile: Profile, cardCount: number, now: number): boolean {
  if (cardCount === 0 || profile.sync) return false;
  return now - (profile.lastBackupAt ?? profile.createdAt) >= BACKUP_REMINDER_DAYS * DAY_MS;
}

const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" });

export function formatDateTime(epochMs: number): string {
  return dateTime.format(epochMs);
}

export function formatDate(epochMs: number): string {
  return dateOnly.format(epochMs);
}
