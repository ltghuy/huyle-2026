// Shared by the progress service and the usage report script (feature 022); no imports, so both can use it.

/** ISO 8601 week of a UTC time, e.g. "2026-W45". */
export function isoWeek(epochMs: number): string {
  const date = new Date(epochMs);
  // The ISO year and week are those of this week's Thursday.
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7)));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.floor((thursday.getTime() - yearStart) / (7 * 86_400_000)) + 1;
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
