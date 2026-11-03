// The main colour picked in Settings (feature 004). It is a device preference
// kept in localStorage, applied as `data-accent` on <html>; `globals.css` maps
// each value to the primary tokens for light and dark mode. Light/dark mode
// itself is next-themes' job.

export const ACCENTS = [
  // Each swatch is the accent's own --primary in the current mode (`--swatch-*` in globals.css), so it
  // shows the colour the buttons and links will get.
  { id: "indigo", label: "Chàm", swatch: "var(--swatch-indigo)" },
  { id: "blue", label: "Xanh dương", swatch: "var(--swatch-blue)" },
  { id: "teal", label: "Xanh ngọc", swatch: "var(--swatch-teal)" },
  { id: "orange", label: "Cam", swatch: "var(--swatch-orange)" },
  { id: "pink", label: "Hồng", swatch: "var(--swatch-pink)" },
] as const;

export type Accent = (typeof ACCENTS)[number]["id"];

export const DEFAULT_ACCENT: Accent = "indigo";
const ACCENT_KEY = "learn-english:accent";

let memoryAccent: Accent = DEFAULT_ACCENT;
const listeners = new Set<() => void>();

export function isAccent(value: unknown): value is Accent {
  return ACCENTS.some((accent) => accent.id === value);
}

export function getAccent(): Accent {
  try {
    const stored = localStorage.getItem(ACCENT_KEY);
    return isAccent(stored) ? stored : memoryAccent;
  } catch {
    return memoryAccent;
  }
}

/** The default colour is the stylesheet's own, so it removes the attribute. */
export function applyAccent(accent: Accent) {
  if (accent === DEFAULT_ACCENT) delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = accent;
}

export function setAccent(accent: Accent) {
  memoryAccent = accent;
  try {
    localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    // Blocked storage: the colour lasts until the tab closes.
  }
  applyAccent(accent);
  for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`. */
export function subscribeAccent(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Runs in <head> before the first paint, so a stored colour never flashes the
 * default (AC-005). Unknown values are ignored, leaving the default.
 */
export const ACCENT_SCRIPT = `try{var a=localStorage.getItem(${JSON.stringify(ACCENT_KEY)});if(${JSON.stringify(
  ACCENTS.map((accent) => accent.id).filter((id) => id !== DEFAULT_ACCENT),
)}.indexOf(a)>-1)document.documentElement.dataset.accent=a}catch(e){}`;
