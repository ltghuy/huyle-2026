-- Sample friends for local development (quick 062, feature 031). Loaded by
-- `pnpm db:seed:social` into the LOCAL D1 only; `pnpm db:unseed:social` removes it again.
-- Each `dev-*` learner is befriended with every real account in the local database, so it
-- works with whichever Google account you signed in with. Safe to run more than once: rows
-- are upserted and the times are relative to now.
--
-- dev-an:   friend, online now
-- dev-binh: friend, active 3 hours ago
-- dev-chi:  friend, never seen
-- dev-dung: not a friend; has sent you a pending request (shows in the bell)

INSERT OR IGNORE INTO `user` (`id`, `name`, `email`, `email_verified`, `image`, `stats_opt_out`, `created_at`, `updated_at`) VALUES
  ('dev-an', 'An (dev)', 'an@dev.local', 1, NULL, 0, 1767225600000, 1767225600000),
  ('dev-binh', 'Bình (dev)', 'binh@dev.local', 1, NULL, 0, 1767225600000, 1767225600000),
  ('dev-chi', 'Chi (dev)', 'chi@dev.local', 1, NULL, 0, 1767225600000, 1767225600000),
  ('dev-dung', 'Dũng (dev)', 'dung@dev.local', 1, NULL, 0, 1767225600000, 1767225600000);

-- Epoch ms of "now", without needing SQLite 3.42's unixepoch('subsec').
INSERT OR REPLACE INTO `presence` (`user_id`, `last_seen_at`, `left`) VALUES
  ('dev-an', CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER), 0),
  ('dev-binh', CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) - 3 * 3600000, 1);

-- Mirrored friendship rows, both sides.
INSERT OR IGNORE INTO `friendships` (`user_id`, `friend_id`, `created_at`)
  SELECT u.id, d.id, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
  FROM `user` u, `user` d
  WHERE u.id NOT LIKE 'dev-%' AND d.id IN ('dev-an', 'dev-binh', 'dev-chi');
INSERT OR IGNORE INTO `friendships` (`user_id`, `friend_id`, `created_at`)
  SELECT d.id, u.id, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
  FROM `user` u, `user` d
  WHERE u.id NOT LIKE 'dev-%' AND d.id IN ('dev-an', 'dev-binh', 'dev-chi');

-- A pending request from Dũng, with its bell notification.
INSERT OR REPLACE INTO `friend_requests` (`from_id`, `to_id`, `status`, `updated_at`)
  SELECT 'dev-dung', u.id, 'pending', CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
  FROM `user` u
  WHERE u.id NOT LIKE 'dev-%';
INSERT OR REPLACE INTO `notifications` (`id`, `user_id`, `kind`, `actor_id`, `created_at`, `read_at`)
  SELECT 'dev-request-' || u.id, u.id, 'friend_request', 'dev-dung', CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER), NULL
  FROM `user` u
  WHERE u.id NOT LIKE 'dev-%';
