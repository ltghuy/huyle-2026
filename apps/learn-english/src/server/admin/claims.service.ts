import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { ContentItemOf } from "@/content/schema";
import { answerKeys, claimKey } from "@/learning/exercises/translate";
import { acceptedText } from "@/learning/exercises/tiles";
import type { Db } from "@/server/db";
import { claims, contentItems } from "@/server/db/schema";
import type { AdminClaimGroup, ClaimDecision } from "./admin.schema";
import { writeItemStatements } from "./content.service";

// "Duyệt câu" on the admin page (feature 038, AC-009 to AC-012): learners' claims grouped like
// `pnpm content:claims pull` groups them, and decided straight into D1. An approved wording joins
// the sentence's wording item live, marked edited so `pnpm content:pull` brings it into git.

type SentenceBody = ContentItemOf<"sentence">["body"];
type WordingBody = ContentItemOf<"wording">["body"];

interface SentenceRow {
  id: string;
  level: string;
  body: SentenceBody;
}

/** The sentence's own English and its accepted word orders, then the approved wordings. */
function acceptedOf(sentence: SentenceRow, wording: WordingBody | undefined): string[] {
  const own = [sentence.body.en, ...(sentence.body.acceptedOrders ?? []).map((order) => acceptedText(sentence.body, order))];
  // One per claim key: the own English and its word order differ only in punctuation.
  const seen = new Set<string>();
  return [...own, ...(wording?.accepted ?? [])].filter((text) => {
    const key = claimKey(text) || text;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const pendingSentenceIds = sql`(select ${claims.sentenceId} from ${claims} where ${claims.status} = 'pending')`;

async function readPending(db: Db, ids?: readonly string[]) {
  const scope = ids ? and(eq(claims.status, "pending"), inArray(claims.id, [...ids])) : eq(claims.status, "pending");
  const sentenceScope = ids ? sql`(select ${claims.sentenceId} from ${claims} where ${scope})` : pendingSentenceIds;
  const [rows, sentences, wordings] = await db.batch([
    db.select().from(claims).where(scope).orderBy(asc(claims.createdAt), asc(claims.id)),
    db
      .select({ id: contentItems.id, level: contentItems.level, body: contentItems.body })
      .from(contentItems)
      .where(and(eq(contentItems.kind, "sentence"), eq(contentItems.deleted, false), sql`${contentItems.id} in ${sentenceScope}`)),
    db
      .select({ id: contentItems.id, level: contentItems.level, body: contentItems.body, deleted: contentItems.deleted })
      .from(contentItems)
      .where(and(eq(contentItems.kind, "wording"), sql`json_extract(${contentItems.body}, '$.sentenceId') in ${sentenceScope}`)),
  ]);
  const sentenceById = new Map(sentences.map((row) => [row.id, row as SentenceRow]));
  const wordingBySentence = new Map(
    wordings.map((row) => [(row.body as WordingBody).sentenceId, { id: row.id, level: row.level, body: row.body as WordingBody, deleted: row.deleted }]),
  );
  return { rows, sentenceById, wordingBySentence };
}

/** Pending claims, one group per sentence and wording, oldest first (AC-009). */
export async function listClaimGroups(db: Db): Promise<AdminClaimGroup[]> {
  const { rows, sentenceById, wordingBySentence } = await readPending(db);
  const groups = new Map<string, AdminClaimGroup>();
  for (const row of rows) {
    const key = `${row.sentenceId}#${claimKey(row.answer)}`;
    const group = groups.get(key);
    if (group) {
      group.ids.push(row.id);
      group.count++;
      group.ai ||= row.source === "ai";
      group.aiExplanationVi ??= row.aiExplanationVi;
      continue;
    }
    const sentence = sentenceById.get(row.sentenceId);
    const wording = wordingBySentence.get(row.sentenceId);
    groups.set(key, {
      key,
      ids: [row.id],
      sentenceId: row.sentenceId,
      answer: row.answer.trim(),
      count: 1,
      ai: row.source === "ai",
      aiExplanationVi: row.aiExplanationVi,
      firstAt: row.createdAt,
      sentence: sentence ? { vi: sentence.body.vi, en: sentence.body.en, level: sentence.level } : null,
      accepted: sentence ? acceptedOf(sentence, wording && !wording.deleted ? wording.body : undefined) : [],
    });
  }
  return [...groups.values()];
}

export type DecideResult = { ok: true; changed: number } | { ok: false; reason: "gone" | "mixed" };

function markStatement(db: Db, ids: readonly string[], status: "approved" | "rejected" | "dropped", now: number, explanationVi?: string) {
  return db
    .update(claims)
    .set({ status, decidedAt: now, explanationVi: status === "rejected" ? (explanationVi ?? null) : null })
    .where(and(inArray(claims.id, [...ids]), eq(claims.status, "pending")));
}

/**
 * Decides one group (AC-010 to AC-012). Only claims still pending change, so a second decision
 * from another tab changes nothing (`changed: 0`). Approving needs the sentence; a wording it
 * already accepts is approved without being added twice.
 */
export async function decideClaims(db: Db, decision: ClaimDecision, now: number): Promise<DecideResult> {
  if (decision.decision !== "approve") {
    const result = await markStatement(db, decision.ids, decision.decision === "reject" ? "rejected" : "dropped", now, decision.explanationVi).returning({ id: claims.id });
    return { ok: true, changed: result.length };
  }
  const { rows, sentenceById, wordingBySentence } = await readPending(db, decision.ids);
  if (rows.length === 0) return { ok: true, changed: 0 };
  const sentenceIds = new Set(rows.map((row) => row.sentenceId));
  if (sentenceIds.size > 1) return { ok: false, reason: "mixed" };
  const sentence = sentenceById.get(rows[0].sentenceId);
  if (!sentence) return { ok: false, reason: "gone" };

  const answer = rows[0].answer.trim();
  const wording = wordingBySentence.get(sentence.id);
  const current = wording && !wording.deleted ? wording.body.accepted : [];
  const known = new Set(acceptedOf(sentence, wording && !wording.deleted ? wording.body : undefined).flatMap(answerKeys));
  const ids = rows.map((row) => row.id);
  const mark = markStatement(db, ids, "approved", now);
  if (answerKeys(answer).some((key) => known.has(key))) {
    await mark;
    return { ok: true, changed: ids.length };
  }
  // The owner's (possibly edited) reason goes with the new wording (feature 042, AC-004).
  const kept = wording && !wording.deleted ? wording.body.explanationsVi : undefined;
  const reason = decision.explanationVi?.trim();
  const explanationsVi = reason ? { ...kept, [answer]: reason } : kept;
  const item: ContentItemOf<"wording"> = {
    id: wording?.id ?? `wording:${sentence.id.replace(/^sentence:/, "")}`,
    kind: "wording",
    level: (wording?.level ?? sentence.level) as ContentItemOf<"wording">["level"],
    sort: 0,
    body: { sentenceId: sentence.id, accepted: [...current, answer], ...(explanationsVi ? { explanationsVi } : {}) },
  };
  await db.batch([...writeItemStatements(db, item, now), mark]);
  return { ok: true, changed: ids.length };
}
