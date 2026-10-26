import { blob, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Published course content. One row per word, grammar topic, sentence,
// writing task or placement item; `body` holds the kind-specific JSON
// (validated by the content schemas). Removed items stay as tombstones so
// clients can drop them without losing the learner's progress.
export const contentItems = sqliteTable(
  "content_items",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["word", "grammar", "sentence", "writing", "placement"] }).notNull(),
    level: text("level", { enum: ["A1", "A2", "B1", "B2", "C1"] }).notNull(),
    topic: text("topic"),
    sort: integer("sort").notNull().default(0),
    body: text("body", { mode: "json" }).notNull(),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
    updatedVersion: integer("updated_version").notNull(),
  },
  (table) => [index("content_items_kind_level").on(table.kind, table.level, table.deleted)],
);

// Single row (id = 1): the version clients poll to know when to refetch.
export const contentMeta = sqliteTable("content_meta", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
  publishedAt: integer("published_at").notNull(),
  counts: text("counts", { mode: "json" }).$type<Record<string, number>>().notNull(),
});

// A learner's synced progress, addressed by the SHA-256 of their sync code.
// `data` is the gzipped snapshot; `rev` guards concurrent writes.
export const syncProfiles = sqliteTable("sync_profiles", {
  codeHash: text("code_hash").primaryKey(),
  data: blob("data", { mode: "buffer" }).notNull(),
  rev: integer("rev").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Anonymous daily counters: (day, metric, key) → count.
export const statsDaily = sqliteTable(
  "stats_daily",
  {
    day: text("day").notNull(),
    metric: text("metric").notNull(),
    key: text("key").notNull().default(""),
    count: integer("count").notNull(),
  },
  (table) => [primaryKey({ columns: [table.day, table.metric, table.key] })],
);

// One row per device per day, keyed by a hash that changes daily, so devices
// can be counted but not followed across days.
export const statsDevices = sqliteTable(
  "stats_devices",
  {
    day: text("day").notNull(),
    deviceHash: text("device_hash").notNull(),
  },
  (table) => [primaryKey({ columns: [table.day, table.deviceHash] })],
);
