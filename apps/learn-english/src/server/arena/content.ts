// A level's content for an Arena match (feature 023): its words, sentences and
// approved wordings, read in one query when the countdown ends (`needsPool`).
//
// No `import "server-only"`: the room, bundled into `worker.ts`, imports this module.
import { and, eq, inArray } from "drizzle-orm";
import { contentItemSchema } from "@/content/schema";
import type { ArenaPool } from "@/learning/arena/questions";
import type { SentenceItem, WordItem } from "@/learning/exercises/types";
import type { Level } from "@/learning/types";
import type { Db } from "@/server/db";
import { contentItems } from "@/server/db/schema";

const ARENA_KINDS = ["word", "sentence", "wording"] as const;

/** The level's published words, sentences and wordings; rows that don't parse are skipped. */
export async function loadArenaPool(db: Db, level: Level): Promise<ArenaPool> {
  const rows = await db
    .select({ id: contentItems.id, kind: contentItems.kind, level: contentItems.level, topic: contentItems.topic, sort: contentItems.sort, body: contentItems.body })
    .from(contentItems)
    .where(and(eq(contentItems.level, level), inArray(contentItems.kind, [...ARENA_KINDS]), eq(contentItems.deleted, false)));

  const words: WordItem[] = [];
  const sentences: SentenceItem[] = [];
  const wordings = new Map<string, string[]>();
  for (const row of rows) {
    const parsed = contentItemSchema.safeParse({ ...row, topic: row.topic ?? undefined });
    if (!parsed.success) continue;
    const item = parsed.data;
    if (item.kind === "word") words.push(item);
    else if (item.kind === "sentence") sentences.push(item);
    else if (item.kind === "wording") wordings.set(item.body.sentenceId, [...(wordings.get(item.body.sentenceId) ?? []), ...item.body.accepted]);
  }
  return { words, sentences, wordings };
}
