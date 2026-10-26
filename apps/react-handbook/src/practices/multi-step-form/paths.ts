// Field paths like "experience.entries.0.endMonth": one string names a value
// in the form, its error, its visited flag and its element id.

export function getAt(source: unknown, path: string): unknown {
  let current = source;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Returns a copy with `value` at `path`; untouched branches keep their identity. */
export function setAt<T>(source: T, path: string, value: unknown): T {
  const [key, ...rest] = path.split(".");
  const node = source as Record<string, unknown> | unknown[];
  const next = rest.length === 0 ? value : setAt(Array.isArray(node) ? node[Number(key)] : node[key], rest.join("."), value);
  if (Array.isArray(node)) {
    const copy = [...node];
    copy[Number(key)] = next;
    return copy as T;
  }
  return { ...node, [key]: next } as T;
}

/** True when `path` is `prefix` or inside it. */
export function isWithin(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}.`);
}

export function fieldId(path: string) {
  return `msf-${path.replaceAll(".", "-")}`;
}

export function errorId(path: string) {
  return `${fieldId(path)}-error`;
}

/**
 * Focuses the control for a path: the element with its id, or the first
 * control inside it (a group of checkboxes, a month picker, a list).
 */
export function focusField(path: string) {
  const el = document.getElementById(fieldId(path));
  if (!el) return false;
  const target = el.matches("input, select, textarea, button") ? el : el.querySelector<HTMLElement>("input, select, textarea, button");
  (target ?? el).focus();
  return true;
}
