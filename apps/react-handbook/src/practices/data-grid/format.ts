// One locale everywhere, so the server-rendered first page and the client
// render the same text (no hydration mismatch).

const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const COUNT = new Intl.NumberFormat("en-US");
// Dates are calendar days (`YYYY-MM-DD`); formatting them in UTC keeps the day.
const DAY = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

export const formatMoney = (value: number) => MONEY.format(value);
export const formatCount = (value: number) => COUNT.format(value);
export const formatDay = (iso: string) => DAY.format(new Date(`${iso}T00:00:00Z`));

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatMs(ms: number) {
  return ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`;
}
