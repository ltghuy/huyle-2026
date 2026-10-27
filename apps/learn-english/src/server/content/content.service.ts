import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import type { ContentKind } from "@/content/schema";
import type { Level } from "@/learning/types";
import type { Db } from "@/server/db";
import { contentItems, contentMeta } from "@/server/db/schema";
import type { ContentVersion } from "./content.schema";

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

/** A `ContentItemsResponse` already serialized, plus its version. */
export interface ContentItemsPayload {
  version: number;
  /** JSON text of `{ version, items, tombstones }` (see `ContentItemsResponse`). */
  json: string;
}

/**
 * The full list for one kind (one level, or every level when `level` is
 * omitted), the ids removed from it and the current version, read in one
 * `db.batch()` so the version matches the rows.
 *
 * Bodies were validated when they were published and are stored as JSON
 * text, so they are copied into the response as they are: parsing and
 * re-serializing a few megabytes of B1/B2 sentences would cost more CPU than
 * the Workers free plan allows (10 ms per request).
 */
export async function getContentItems(
  db: Db,
  { kind, level }: { kind: ContentKind; level?: Level },
): Promise<ContentItemsPayload> {
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
        // Raw text: the column's JSON mode would parse every body.
        body: sql<string>`${contentItems.body}`,
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

  const { version } = toVersion(meta);
  const items = rows.map(({ id, kind, level, topic, sort, body }) => {
    const fields = JSON.stringify(topic === null ? { id, kind, level, sort } : { id, kind, level, topic, sort });
    return `${fields.slice(0, -1)},"body":${body}}`;
  });
  const tombstones = JSON.stringify(removed.map((row) => row.id));
  return { version, json: `{"version":${version},"items":[${items.join(",")}],"tombstones":${tombstones}}` };
}
