// WCAG 2 contrast ratio between two sRGB colors given as #rrggbb.

function channel(value: number) {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export const LEVELS = [
  { id: "aa", label: "Normal text (AA)", min: 4.5 },
  { id: "aa-large", label: "Large text, 24px or 18.5px bold (AA)", min: 3 },
  { id: "aaa", label: "Normal text, enhanced (AAA)", min: 7 },
  { id: "ui", label: "Icons, borders, focus rings (AA)", min: 3 },
] as const;

/** Rounded down to two decimals, so 4.499 never shows as a passing 4.5. */
export function formatRatio(ratio: number) {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}
