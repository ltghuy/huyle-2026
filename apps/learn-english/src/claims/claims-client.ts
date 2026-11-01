import { localDate } from "@/learning/attendance";
import { claimKey, type ClaimDraft } from "@/learning/exercises/translate";
import type { CardItemId, StoredClaim } from "@/learning/types";
import { bringForward } from "@/lib/session/record";
import {
  claimsResponseSchema,
  claimStatusResponseSchema,
  MAX_CLAIMS_PER_REQUEST,
  MAX_STATUS_IDS,
} from "@/server/claims/claims.schema";
import { getClaims, getClaimsByStatus, putClaims } from "@/storage/claims";
import { getProfile } from "@/storage/meta";

// Claims (feature 016): a wrong translate answer the learner says is also
// correct. The claim is kept on the device, sent in the background and
// resent until the server answers; then the device asks about it at most once
// a local day. Only a rejection reaches the learner, once, and brings the
// sentence's words and grammar forward for review. Every function swallows
// its errors: claims must never block learning.

export const CLAIMS_URL = "/api/claims";
export const CLAIM_STATUS_URL = "/api/claims/status";
/** A pending claim the server no longer knows (deleted after its decision, or lost) is forgotten after this long. */
export const FORGET_AFTER_MS = 120 * 86_400_000;

export interface ClaimInput extends ClaimDraft {
  related: CardItemId[];
}

const chunks = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" }, keepalive: true });
}

/** Stores the claim unless the same answer was already claimed for this sentence. Returns whether it was stored. */
export async function queueClaim(input: ClaimInput, now: number = Date.now()): Promise<boolean> {
  const key = claimKey(input.answer);
  const existing = await getClaims();
  if (existing.some((claim) => claim.sentenceId === input.sentenceId && claimKey(claim.answer) === key)) return false;
  await putClaims([{ ...input, id: crypto.randomUUID(), status: "unsent", createdAt: now, updatedAt: now }]);
  return true;
}

/** Keeps the claim on the device and sends it in the background (016 AC-007, AC-008). Never throws. */
export function submitClaim(input: ClaimInput, now: number = Date.now()): void {
  void queueClaim(input, now)
    .then(() => flushClaims(now))
    .catch(() => {});
}

/**
 * Sends the claims not sent yet. Accepted ones wait for a decision; ones the
 * server refused (over the daily limit, invalid) are dropped quietly. A
 * network or server error keeps them for the next try (AC-008, AC-010).
 */
export async function flushClaims(now: number = Date.now()): Promise<void> {
  try {
    const unsent = await getClaimsByStatus("unsent");
    if (!unsent.length) return;
    const profile = await getProfile();
    if (!profile) return;
    for (const batch of chunks(unsent, MAX_CLAIMS_PER_REQUEST)) {
      const response = await postJson(CLAIMS_URL, {
        deviceId: profile.deviceId,
        claims: batch.map(({ id, sentenceId, answer }) => ({ id, sentenceId, answer })),
      });
      // Too many requests or a server error: try again later.
      if (response.status === 429 || response.status >= 500) return;
      const parsed = response.ok ? claimsResponseSchema.safeParse(await response.json()) : null;
      const accepted = new Set(parsed?.success ? parsed.data.accepted : []);
      await putClaims(
        batch.map((claim): StoredClaim =>
          accepted.has(claim.id)
            ? { ...claim, status: "pending", sentAt: now, checkedAt: now, updatedAt: now }
            : { ...claim, status: "dropped", updatedAt: now },
        ),
      );
    }
  } catch {
    // Offline or storage unavailable: the claims stay unsent.
  }
}

/**
 * Asks about the pending claims not checked today (AC-015 to AC-017). A
 * rejection brings the related cards forward once and waits to be shown; an
 * approval or a drop changes nothing for the learner.
 */
export async function checkClaims(now: number = Date.now()): Promise<void> {
  try {
    const profile = await getProfile();
    if (!profile) return;
    const today = localDate(now, profile.timeZone);
    const due = (await getClaimsByStatus("pending")).filter((claim) => claim.checkedAt === undefined || localDate(claim.checkedAt, profile.timeZone) !== today);
    for (const batch of chunks(due, MAX_STATUS_IDS)) {
      const response = await postJson(CLAIM_STATUS_URL, { ids: batch.map((claim) => claim.id) });
      if (!response.ok) return;
      const parsed = claimStatusResponseSchema.safeParse(await response.json());
      if (!parsed.success) return;
      const answers = new Map(parsed.data.claims.map((entry) => [entry.id, entry]));
      const updated: StoredClaim[] = [];
      for (const claim of batch) {
        const entry = answers.get(claim.id);
        if (!entry) {
          const forgotten = now - claim.createdAt > FORGET_AFTER_MS;
          updated.push({ ...claim, status: forgotten ? "dropped" : "pending", checkedAt: now, updatedAt: now });
        } else if (entry.status === "rejected") {
          await bringForward(claim.related, now);
          updated.push({ ...claim, status: "rejected", explanationVi: entry.explanationVi, checkedAt: now, updatedAt: now });
        } else {
          updated.push({ ...claim, status: entry.status, checkedAt: now, updatedAt: now });
        }
      }
      await putClaims(updated);
    }
  } catch {
    // Try again on the next open.
  }
}

/** Rejected claims the learner hasn't seen yet. */
export async function rejectedClaims(): Promise<StoredClaim[]> {
  try {
    return (await getClaimsByStatus("rejected")).toSorted((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

/** The learner has read the notice: it is never shown again (AC-015). */
export async function dismissRejected(claims: readonly StoredClaim[], now: number = Date.now()): Promise<void> {
  try {
    await putClaims(claims.map((claim) => ({ ...claim, status: "shown", updatedAt: now })));
  } catch {
    // Shown again next time; harmless.
  }
}
