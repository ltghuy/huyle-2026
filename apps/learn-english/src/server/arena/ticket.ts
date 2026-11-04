// Room tickets (feature 023): a signed-in route issues one, the custom worker
// checks it when the browser opens the room's socket. It carries who the player
// is, so the room never trusts identity from the browser. HMAC-SHA256 with
// ARENA_SECRET, valid for 60 s and only for one room code.
//
// No `import "server-only"`: `worker.ts` bundles this module (knowledge.md, 023).

/** How long a ticket can be used to open the socket. */
export const TICKET_TTL_MS = 60_000;

export interface TicketClaims {
  /** User id. */
  uid: string;
  name: string;
  image: string | null;
  /** The room code the ticket opens. */
  code: string;
  /** Epoch ms after which the ticket is refused. */
  exp: number;
}

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function key(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error("ARENA_SECRET must be at least 32 characters");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** A ticket for `claims` (without `exp`), valid for TICKET_TTL_MS from `now`. */
export async function signTicket(claims: Omit<TicketClaims, "exp">, secret: string, now: number): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify({ ...claims, exp: now + TICKET_TTL_MS })));
  const signature = await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}

/** The ticket's claims, or null when it is malformed, tampered with, expired, or for another room. */
export async function verifyTicket(ticket: string, secret: string, code: string, now: number): Promise<TicketClaims | null> {
  const [payload, signature, extra] = ticket.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  let claims: TicketClaims;
  try {
    const valid = await crypto.subtle.verify("HMAC", await key(secret), fromBase64url(signature), encoder.encode(payload));
    if (!valid) return null;
    claims = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as TicketClaims;
  } catch {
    return null;
  }
  if (typeof claims.uid !== "string" || typeof claims.name !== "string" || typeof claims.exp !== "number") return null;
  if (claims.code !== code || now >= claims.exp) return null;
  return { uid: claims.uid, name: claims.name, image: typeof claims.image === "string" ? claims.image : null, code: claims.code, exp: claims.exp };
}
