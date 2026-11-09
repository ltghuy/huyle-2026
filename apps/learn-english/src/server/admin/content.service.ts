import "server-only";
import { and, asc, count, eq, or, sql, type SQL } from "drizzle-orm";
import { CONTENT_KINDS, contentItemSchema, type ContentItem } from "@/content/schema";
import type { Db } from "@/server/db";
import { contentItems, contentMeta } from "@/server/db/schema";
import { CONTENT_PAGE_SIZE, READ_ONLY_KINDS, type AdminContentItem, type AdminContentRow, type ContentListQuery, type SaveItemBody } from "./admin.schema";

// "Nội dung" on the admin page (feature 038, AC-013 to AC-017). Every write is one `db.batch()`
// that bumps the content version (so learners' apps refetch), writes the row with that version and
// `admin_edited_at` (so `pnpm content:pull` brings it into git, AC-018), and recounts the items.

const rowColumns = {
  id: contentItems.id,
  kind: contentItems.kind,
  level: contentItems.level,
  topic: contentItems.topic,
  sort: contentItems.sort,
  deleted: contentItems.deleted,
  adminEditedAt: contentItems.adminEditedAt,
  updatedVersion: contentItems.updatedVersion,
};

/** `%` and `_` typed into the search box match themselves. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function listContent(db: Db, query: ContentListQuery): Promise<{ items: AdminContentRow[]; total: number; page: number }> {
  const filters: (SQL | undefined)[] = [query.kind ? eq(contentItems.kind, query.kind) : undefined, query.level ? eq(contentItems.level, query.level) : undefined];
  if (query.q) {
    const pattern = likePattern(query.q);
    filters.push(or(sql`${contentItems.id} like ${pattern} escape '\\'`, sql`${contentItems.body} like ${pattern} escape '\\'`));
  }
  const where = and(...filters);
  const [rows, total] = await db.batch([
    db
      .select(rowColumns)
      .from(contentItems)
      .where(where)
      .orderBy(asc(contentItems.kind), asc(contentItems.level), asc(contentItems.sort), asc(contentItems.id))
      .limit(CONTENT_PAGE_SIZE)
      .offset((query.page - 1) * CONTENT_PAGE_SIZE),
    db.select({ n: count() }).from(contentItems).where(where),
  ]);
  return { items: rows, total: total[0]?.n ?? 0, page: query.page };
}

export async function getContentItem(db: Db, id: string): Promise<AdminContentItem | null> {
  const rows = await db
    .select({ ...rowColumns, body: contentItems.body })
    .from(contentItems)
    .where(eq(contentItems.id, id))
    .limit(1);
  return rows[0] ?? null;
}

const CURRENT_VERSION = sql`(select ${contentMeta.version} from ${contentMeta} where ${contentMeta.id} = 1)`;

/** Statements that open a new content version and recount live items; the row writes go between them. */
function versionStatements(db: Db, now: number) {
  const counts = sql.raw(
    `json_object(${CONTENT_KINDS.map((kind) => `'${kind}', (select count(*) from content_items where kind = '${kind}' and deleted = 0)`).join(", ")})`,
  );
  return {
    bump: db
      .insert(contentMeta)
      .values({ id: 1, version: 1, publishedAt: now, counts: {} })
      .onConflictDoUpdate({ target: contentMeta.id, set: { version: sql`${contentMeta.version} + 1`, publishedAt: now } }),
    recount: db.update(contentMeta).set({ counts: sql`${counts}` }).where(eq(contentMeta.id, 1)),
  };
}

/** Writes `item` live with a new version, marked as edited here. Shared with claim approval. */
export function writeItemStatements(db: Db, item: ContentItem, now: number) {
  const { bump, recount } = versionStatements(db, now);
  const values = { kind: item.kind, level: item.level, topic: item.topic ?? null, sort: item.sort, body: item.body, deleted: false, updatedVersion: sql`${CURRENT_VERSION}`, adminEditedAt: now };
  const upsert = db
    .insert(contentItems)
    .values({ id: item.id, ...values })
    .onConflictDoUpdate({ target: contentItems.id, set: values });
  return [bump, upsert, recount] as const;
}

export type SaveResult = { ok: true; item: AdminContentItem } | { ok: false; reason: "read-only" | "exists" | "not-found" } | { ok: false; reason: "invalid"; issues: { path: string; message: string }[] };

/** Adds or replaces one item after checking it with the publish script's rules (AC-015, AC-016). */
export async function saveContentItem(db: Db, input: SaveItemBody, now: number): Promise<SaveResult> {
  if (READ_ONLY_KINDS.includes(input.item.kind)) return { ok: false, reason: "read-only" };
  const parsed = contentItemSchema.safeParse({ ...input.item, topic: input.item.topic ?? undefined });
  if (!parsed.success) {
    return { ok: false, reason: "invalid", issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
  }
  const existing = await getContentItem(db, parsed.data.id);
  if (input.create && existing) return { ok: false, reason: "exists" };
  if (!input.create && !existing) return { ok: false, reason: "not-found" };
  if (existing && existing.kind !== parsed.data.kind) return { ok: false, reason: "invalid", issues: [{ path: "kind", message: "Không đổi được loại của một mục đã có." }] };
  if (existing && READ_ONLY_KINDS.includes(existing.kind)) return { ok: false, reason: "read-only" };
  await db.batch(writeItemStatements(db, parsed.data, now));
  return { ok: true, item: (await getContentItem(db, parsed.data.id))! };
}

/** Removes an item (a tombstone, as the publish script makes) or brings it back (AC-017). */
export async function setContentRemoved(db: Db, id: string, removed: boolean, now: number): Promise<{ ok: true } | { ok: false; reason: "read-only" | "not-found" }> {
  const existing = await getContentItem(db, id);
  if (!existing) return { ok: false, reason: "not-found" };
  if (READ_ONLY_KINDS.includes(existing.kind)) return { ok: false, reason: "read-only" };
  const { bump, recount } = versionStatements(db, now);
  const mark = db.update(contentItems).set({ deleted: removed, updatedVersion: sql`${CURRENT_VERSION}`, adminEditedAt: now }).where(eq(contentItems.id, id));
  await db.batch([bump, mark, recount]);
  return { ok: true };
}
