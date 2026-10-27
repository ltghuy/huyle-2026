// Sync codes: 12 Crockford base32 characters (60 bits), shown as
// XXXX-XXXX-XXXX. Pure functions with no `server-only`, so the settings panel
// can normalise what the learner types with the same rules as the server.

/** Crockford base32: digits and letters without I, L, O and U. */
export const SYNC_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const SYNC_CODE_LENGTH = 12;

const GROUP = 4;
const NORMALISED = /^[0-9A-HJKMNP-TV-Z]{12}$/;

/** Groups 12 normalised characters as XXXX-XXXX-XXXX. */
export function formatSyncCode(normalised: string): string {
  const groups: string[] = [];
  for (let i = 0; i < normalised.length; i += GROUP) groups.push(normalised.slice(i, i + GROUP));
  return groups.join("-");
}

/** A new random code, already formatted. */
export function generateSyncCode(): string {
  // 32 divides 256, so masking each byte to 5 bits keeps the choice uniform.
  const bytes = crypto.getRandomValues(new Uint8Array(SYNC_CODE_LENGTH));
  let code = "";
  for (const byte of bytes) code += SYNC_CODE_ALPHABET[byte & 31];
  return formatSyncCode(code);
}

/**
 * The 12-character form of what a learner typed: uppercase, without spaces or
 * dashes, with O read as 0 and I/L as 1. Returns null when anything else is
 * left (other characters, U, or the wrong length).
 */
export function normalizeSyncCode(input: string): string | null {
  const code = input
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  return NORMALISED.test(code) ? code : null;
}

/** Lowercase hex SHA-256 of a normalised code: the only form the server stores. */
export async function hashSyncCode(normalised: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalised));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
