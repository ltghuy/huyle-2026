import { blob, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Published course content. One row per word, grammar topic, sentence,
// writing task or placement item; `body` holds the kind-specific JSON
// (validated by the content schemas). Removed items stay as tombstones so
// clients can drop them without losing the learner's progress.
export const contentItems = sqliteTable(
  "content_items",
  {
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["word", "grammar", "sentence", "writing", "placement", "forms", "set", "wording"] }).notNull(),
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

// Leaderboard (feature 007; ranked by streak since feature 013), opt-in and
// separate from the anonymous stats. One row per learner: `id` is random and
// made in the browser, only the SHA-256 of its secret is stored. `streak` and
// `earned` (points ever earned) are as of `last_date`, the learner's last daily
// lesson; rows whose `last_date` is before yesterday are left off the board.
// Rows untouched for 90 days are deleted.
export const leaderboardEntries = sqliteTable(
  "leaderboard_entries",
  {
    id: text("id").primaryKey(),
    // The signed-in learner who owns the entry (feature 022); deleting the account removes it.
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    name: text("name").notNull(),
    streak: integer("streak").notNull().default(0),
    earned: integer("earned").notNull().default(0),
    lastDate: text("last_date").notNull().default(""),
    reachedAt: integer("reached_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("leaderboard_entries_last_date_streak").on(table.lastDate, table.streak)],
);

// Learner claims that a wrong translation was right (feature 016). `id` is a
// random UUID made in the browser; the device id is stored only as a hash that
// changes daily (as in `stats_devices`), which caps claims per device per day.
// The owner decides each claim with `scripts/claims.ts`; decided rows are
// deleted 90 days after the decision.
export const claims = sqliteTable(
  "claims",
  {
    id: text("id").primaryKey(),
    sentenceId: text("sentence_id").notNull(),
    answer: text("answer").notNull(),
    deviceHash: text("device_hash").notNull(),
    day: text("day").notNull(),
    createdAt: integer("created_at").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected", "dropped"] }).notNull().default("pending"),
    explanationVi: text("explanation_vi"),
    decidedAt: integer("decided_at"),
    // "ai" when the learner's own AI key accepted the wording (feature 033).
    source: text("source", { enum: ["learner", "ai"] }).notNull().default("learner"),
  },
  (table) => [index("claims_status").on(table.status), index("claims_device_day").on(table.deviceHash, table.day)],
);

// Google sign-in (feature 022). `user`, `session`, `account` and `verification` are Better Auth's
// core tables (fields from `@better-auth/core` `getAuthTables`, 1.7.15); the Drizzle adapter maps
// them by these property names. `statsOptOut` is an additional user field, set from the learner's
// "Gửi thống kê ẩn danh" setting so the usage report can leave them out (AC-028).
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  statsOptOut: integer("stats_opt_out", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("session_user_id").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("account_user_id").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("verification_identifier").on(table.identifier)],
);

// A signed-in learner's progress (feature 022): the same gzipped snapshot as `sync_profiles.data`,
// one row per account, merged in the browser. `rev` guards concurrent writes from several devices.
export const accountProgress = sqliteTable("account_progress", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  data: blob("data", { mode: "buffer" }).notNull(),
  rev: integer("rev").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Weeks an account was active, per device (feature 022, AC-027): `week` is the ISO week
// (`2026-W45`), `device_hash` the SHA-256 of device id + user id + STATS_SALT. Counts only, for the
// owner's usage report; removed with the account.
export const accountActivity = sqliteTable(
  "account_activity",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    week: text("week").notNull(),
    deviceHash: text("device_hash").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.week, table.deviceHash] }), index("account_activity_week").on(table.week)],
);

// Arena results per account (feature 023, AC-029/AC-030): wins, losses, the current run of wins
// and the longest one. Written by the room when a match ends; removed with the account.
export const arenaStats = sqliteTable("arena_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});

// Arena match history (feature 025): one row per player per finished match, from that player's
// side, with the opponent as they were in the match. The room keeps each player's 50 newest.
// Removed with the owner's account; when the opponent deletes theirs, `opponent_id` goes null
// and account deletion blanks the name and picture (`deleteAccount`).
export const arenaMatches = sqliteTable(
  "arena_matches",
  {
    matchId: text("match_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    opponentId: text("opponent_id").references(() => user.id, { onDelete: "set null" }),
    opponentName: text("opponent_name"),
    opponentImage: text("opponent_image"),
    won: integer("won", { mode: "boolean" }).notNull(),
    forfeit: integer("forfeit", { mode: "boolean" }).notNull(),
    roundsWon: integer("rounds_won").notNull(),
    opponentRoundsWon: integer("opponent_rounds_won").notNull(),
    /** JSON `HistoryRound[]` from the owner's side. */
    rounds: text("rounds").notNull(),
    mode: text("mode").notNull(),
    level: text("level").notNull(),
    bestOf: integer("best_of").notNull(),
    endedAt: integer("ended_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.matchId, table.userId] }), index("arena_matches_user_ended").on(table.userId, table.endedAt)],
);

// Arena friends (feature 031). A friendship is two mirrored rows, one per side, so a learner's
// list is one indexed read. Both sides' rows go with either account.
export const friendships = sqliteTable(
  "friendships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    friendId: text("friend_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.friendId] })],
);

// Friend requests (feature 031). A pending row waits for the receiver; an answered one is
// deleted, except a declined one, which stays for 7 days from `updated_at` so the sender can't
// send again straight away (they aren't told it was declined).
export const friendRequests = sqliteTable(
  "friend_requests",
  {
    fromId: text("from_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toId: text("to_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "declined"] }).notNull(),
    /** Epoch ms: when it was sent, or when it was declined. */
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.fromId, table.toId] }), index("friend_requests_to").on(table.toId, table.status)],
);

// When each learner was last active (feature 031). The pulse writes it at most every 45 s; the
// last tab's goodbye sets `left`. Online = not left and seen within the last 150 s.
export const presence = sqliteTable("presence", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  lastSeenAt: integer("last_seen_at").notNull(),
  left: integer("left", { mode: "boolean" }).notNull().default(false),
});

// The notification bell (feature 031). One row per recipient, kind and actor, so a request sent
// again replaces its notification. A row goes with either account; the bell keeps 30 days.
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["friend_request", "friend_added", "friend_accepted"] }).notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    readAt: integer("read_at"),
  },
  (table) => [
    index("notifications_user_created").on(table.userId, table.createdAt),
    uniqueIndex("notifications_user_kind_actor").on(table.userId, table.kind, table.actorId),
  ],
);
