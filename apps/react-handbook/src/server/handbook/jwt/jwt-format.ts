// Client-safe JWT text handling, shared by the page's live decoder and the
// server's verifier: base64url, splitting a compact token into its parts, and
// what each registered claim means. Decoding never throws; problems come back
// per part.

export const MAX_TOKEN_LENGTH = 8192;

const B64URL = /^[A-Za-z0-9_-]*$/;

export function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Null when the text isn't base64url. */
export function base64UrlDecode(text: string): Uint8Array | null {
  if (!B64URL.test(text) || text.length % 4 === 1) return null;
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export type TokenPart = "token" | "header" | "payload" | "signature";
export type DecodeError = { part: TokenPart; message: string };

export type DecodedToken = {
  parts: string[];
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  /** Raw JSON text of each part as decoded, for display when it isn't valid JSON. */
  headerText: string | null;
  payloadText: string | null;
  signatureBytes: number | null;
  errors: DecodeError[];
};

function decodeJsonPart(part: "header" | "payload", text: string, errors: DecodeError[]) {
  const bytes = base64UrlDecode(text);
  if (!bytes) {
    errors.push({ part, message: `The ${part} isn't base64url (only A–Z, a–z, 0–9, "-" and "_" are allowed).` });
    return { value: null, text: null };
  }
  const json = new TextDecoder().decode(bytes);
  try {
    const value: unknown = JSON.parse(json);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      errors.push({ part, message: `The ${part} decodes to JSON, but not to an object.` });
      return { value: null, text: json };
    }
    return { value: value as Record<string, unknown>, text: json };
  } catch {
    errors.push({ part, message: `The ${part} decodes to text that isn't valid JSON.` });
    return { value: null, text: json };
  }
}

export function decodeToken(input: string): DecodedToken {
  const text = input.trim();
  const errors: DecodeError[] = [];
  const empty: DecodedToken = { parts: [], header: null, payload: null, headerText: null, payloadText: null, signatureBytes: null, errors };
  if (text === "") {
    errors.push({ part: "token", message: "Paste a token: three base64url parts separated by dots." });
    return empty;
  }
  if (text.length > MAX_TOKEN_LENGTH) {
    errors.push({ part: "token", message: `That's ${text.length.toLocaleString("en")} characters; this demo reads tokens up to ${MAX_TOKEN_LENGTH.toLocaleString("en")}.` });
    return empty;
  }
  const parts = text.split(".");
  if (parts.length !== 3) {
    errors.push({ part: "token", message: `A signed JWT has 3 parts separated by dots; this has ${parts.length}.${parts.length === 5 ? " Five parts is an encrypted token (JWE)." : ""}` });
    return { ...empty, parts };
  }
  const header = decodeJsonPart("header", parts[0], errors);
  const payload = decodeJsonPart("payload", parts[1], errors);
  const signature = base64UrlDecode(parts[2]);
  if (!signature) errors.push({ part: "signature", message: "The signature isn't base64url." });
  return {
    parts,
    header: header.value,
    payload: payload.value,
    headerText: header.text,
    payloadText: payload.text,
    signatureBytes: signature ? signature.length : null,
    errors,
  };
}

/** What a header field or claim means, in words. */
export const FIELD_NOTES: Record<string, string> = {
  alg: "Algorithm the token claims it was signed with. A verifier must not let this choose the algorithm.",
  typ: "Media type, usually JWT. Informational.",
  kid: "Key id: which of the issuer's keys signed it. Used to pick the key from the server's own key set.",
  jwk: "A public key carried inside the token. Never trust it: anyone can sign with their own key.",
  iss: "Issuer: who created and signed the token.",
  sub: "Subject: who the token is about, usually a user id.",
  aud: "Audience: which API the token is meant for. An API must reject tokens for someone else.",
  exp: "Expires at (seconds since 1970). Reject after this time.",
  nbf: "Not before: reject before this time.",
  iat: "Issued at.",
  jti: "Token id, unique per token. Lets a server deny-list one token.",
  role: "A private claim this demo adds. Anyone can read it; only the signature stops edits.",
  sid: "Demo session id: ties the token to a server-side session.",
  ver: "Token version: the server rejects tokens older than the user's current version.",
};

export const TIME_CLAIMS = new Set(["exp", "nbf", "iat"]);

export function formatClaimTime(seconds: number) {
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? "not a valid time" : date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}
