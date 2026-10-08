// Formatters are created once: building an Intl formatter per cell would be
// one of the costs this practice measures.

const PRICE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const PERCENT = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });
const VOLUME = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const COUNT = new Intl.NumberFormat("en-US");
const TIME = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export const formatPrice = (value: number) => PRICE.format(value);
export const formatChange = (value: number) => `${PERCENT.format(value)}%`;
export const formatVolume = (value: number) => VOLUME.format(value);
export const formatCount = (value: number) => COUNT.format(value);
export const formatTime = (epochMs: number) => TIME.format(epochMs);

export function formatMs(ms: number | null) {
  if (ms === null) return "—";
  return ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`;
}
