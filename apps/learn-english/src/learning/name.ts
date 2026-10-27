// The learner's name (feature 003): asked on the first visit, used to greet
// them and, later, on certificates.

export const NAME_MAX_LENGTH = 40;

/** Trims and collapses spaces; null unless 1–40 characters with at least one letter. */
export function cleanName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  const length = [...name].length;
  if (length === 0 || length > NAME_MAX_LENGTH || !/\p{L}/u.test(name)) return null;
  return name;
}
