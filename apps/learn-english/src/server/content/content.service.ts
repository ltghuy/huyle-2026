import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { ContentItem, ContentKind } from "@/content/schema";
import type { Level } from "@/learning/types";
import type { Db } from "@/server/db";
import { contentItems, contentMeta } from "@/server/db/schema";
import type { ContentItemsResponse, ContentVersion } from "./content.schema";

// The single `content_meta` row.
const META_ID = 1;

function versionQuery(db: Db) {
  return db
    .select({ version: contentMeta.version, publishedAt: contentMeta.publishedAt })
    .from(contentMeta)
    .where(eq(contentMeta.id, META_ID))
    .limit(1);
}

function toVersion(rows: { version: number; publishedAt: number }[]): ContentVersion {
  return rows[0] ?? { version: 0, publishedAt: 0 };
}

export async function getContentVersion(db: Db): Promise<ContentVersion> {
  return toVersion(await versionQuery(db));
}

/**
 * The full list for one kind (one level, or every level when `level` is
 * omitted), the ids removed from it and the current version, read in one
 * `db.batch()` so the version matches the rows.
 */
export async function getContentItems(
  db: Db,
  { kind, level }: { kind: ContentKind; level?: Level },
): Promise<ContentItemsResponse> {
  const scope = and(eq(contentItems.kind, kind), level ? eq(contentItems.level, level) : undefined);

  const [meta, rows, removed] = await db.batch([
    versionQuery(db),
    db
      .select({
        id: contentItems.id,
        kind: contentItems.kind,
        level: contentItems.level,
        topic: contentItems.topic,
        sort: contentItems.sort,
        body: contentItems.body,
      })
      .from(contentItems)
      .where(and(scope, eq(contentItems.deleted, false)))
      .orderBy(asc(contentItems.level), asc(contentItems.sort), asc(contentItems.id)),
    db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(and(scope, eq(contentItems.deleted, true)))
      .orderBy(asc(contentItems.id)),
  ]);

  // Rows were validated against the content schemas when they were published;
  // re-parsing every body here would spend the Worker's CPU budget.
  const items = rows.map(({ topic, ...row }) => (topic === null ? row : { ...row, topic }) as ContentItem);

  return { version: toVersion(meta).version, items, tombstones: removed.map((row) => row.id) };
}
