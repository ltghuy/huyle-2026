// The learner link's protocol (feature 035): one socket per signed-in tab to the
// learner's own Durable Object, so a friend's challenge reaches them on any page.
// Pure and shared by the Durable Object and the browser. A challenge is never
// stored: every frame carries the host's id and the room code, and each side
// keeps its own 30-second timer.
import { z } from "zod";
import { CODE_PATTERN, settingsSchema, type ArenaSettings } from "./protocol";

/** How long a challenge waits for an answer (decisions.md). */
export const CHALLENGE_MS = 30_000;
/** The code a link ticket is signed for. Not a valid room code, so it never opens a room. */
export const LINK_CODE = "link";

const userId = z.string().min(1).max(100);
const code = z.string().regex(CODE_PATTERN);

/** What a tab tells its link. */
export const linkClientFrameSchema = z.discriminatedUnion("type", [
  /** The room page this tab has open, or null: any other open room makes the learner busy. */
  z.object({ type: z.literal("room"), code: code.nullable() }),
  /** The learner's answer to `hostId`'s challenge to `code`. */
  z.object({ type: z.literal("answer"), hostId: userId, code, accept: z.boolean() }),
]);
export type LinkClientFrame = z.infer<typeof linkClientFrameSchema>;

export interface ChallengeFrom {
  id: string;
  name: string;
  image: string | null;
}

/** What a link sends its tabs. */
export type LinkFrame =
  | { type: "challenge"; from: ChallengeFrom; code: string; settings: ArenaSettings }
  /** The host cancelled, or the learner answered in another tab. */
  | { type: "challenge-closed"; hostId: string; code: string }
  /** To the host: the friend's answer. */
  | { type: "reply"; friendId: string; code: string; accept: boolean };

const linkFrameSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("challenge"),
    from: z.object({ id: userId, name: z.string(), image: z.string().nullable() }),
    code,
    settings: settingsSchema,
  }),
  z.object({ type: z.literal("challenge-closed"), hostId: userId, code }),
  z.object({ type: z.literal("reply"), friendId: userId, code, accept: z.boolean() }),
]);

/** What `deliver` found: sent, or why not. "here": the friend already has this room open. */
export type DeliveryState = "sent" | "busy" | "offline" | "here";

/** Frames are tiny; anything longer is refused unread. */
const MAX_LINK_FRAME_BYTES = 1024;

function parse<T extends z.ZodType>(schema: T, raw: string): z.infer<T> | null {
  if (raw.length > MAX_LINK_FRAME_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = schema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** A tab's frame, or null when it is too long, not JSON or unknown. */
export function parseLinkClientFrame(raw: string): LinkClientFrame | null {
  return parse(linkClientFrameSchema, raw);
}

/** A link's frame for the browser, or null. */
export function parseLinkFrame(raw: string): LinkFrame | null {
  return parse(linkFrameSchema, raw) as LinkFrame | null;
}

/** The toast and pending-row key for one challenge. */
export function challengeKey(hostId: string, code: string): string {
  return `challenge:${hostId}:${code}`;
}
