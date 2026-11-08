-- Two signed-in learners for e2e (feature 023), loaded by `pnpm e2e:seed` into
-- the e2e D1 only. `signInAs` in e2e/helpers.ts signs these session tokens; keep
-- the ids, names and tokens in step with `E2E_USERS` there.
INSERT INTO `user` (`id`, `name`, `email`, `email_verified`, `image`, `stats_opt_out`, `created_at`, `updated_at`) VALUES
  ('e2e-minh', 'Minh Anh', 'minh@e2e.test', 1, NULL, 0, 1767225600000, 1767225600000),
  ('e2e-lan', 'Lan', 'lan@e2e.test', 1, NULL, 0, 1767225600000, 1767225600000);

INSERT INTO `session` (`id`, `user_id`, `token`, `expires_at`, `ip_address`, `user_agent`, `created_at`, `updated_at`) VALUES
  ('e2e-session-minh', 'e2e-minh', 'e2e-token-minh', 4102444800000, NULL, NULL, 1767225600000, 1767225600000),
  ('e2e-session-lan', 'e2e-lan', 'e2e-token-lan', 4102444800000, NULL, NULL, 1767225600000, 1767225600000);

-- Two more learners for the friends spec (feature 031), with one finished match between them so
-- "Kết bạn" shows in their match history. Only that spec uses them, so it can change their
-- friendship while the Arena specs play with Minh and Lan in parallel.
INSERT INTO `user` (`id`, `name`, `email`, `email_verified`, `image`, `stats_opt_out`, `created_at`, `updated_at`) VALUES
  ('e2e-khoa', 'Khoa', 'khoa@e2e.test', 1, NULL, 0, 1767225600000, 1767225600000),
  ('e2e-hoa', 'Hoa', 'hoa@e2e.test', 1, NULL, 0, 1767225600000, 1767225600000);

INSERT INTO `session` (`id`, `user_id`, `token`, `expires_at`, `ip_address`, `user_agent`, `created_at`, `updated_at`) VALUES
  ('e2e-session-khoa', 'e2e-khoa', 'e2e-token-khoa', 4102444800000, NULL, NULL, 1767225600000, 1767225600000),
  ('e2e-session-hoa', 'e2e-hoa', 'e2e-token-hoa', 4102444800000, NULL, NULL, 1767225600000, 1767225600000);

INSERT INTO `arena_matches` (`match_id`, `user_id`, `opponent_id`, `opponent_name`, `opponent_image`, `won`, `forfeit`, `rounds_won`, `opponent_rounds_won`, `rounds`, `mode`, `level`, `best_of`, `ended_at`) VALUES
  ('e2e-friends-match', 'e2e-khoa', 'e2e-hoa', 'Hoa', NULL, 1, 0, 1, 0, '[{"round":1,"mine":7,"theirs":5,"won":true,"suddenDeath":false,"onTime":false}]', 'listen', 'A2', 1, 1767225600000),
  ('e2e-friends-match', 'e2e-hoa', 'e2e-khoa', 'Khoa', NULL, 0, 0, 0, 1, '[{"round":1,"mine":5,"theirs":7,"won":false,"suddenDeath":false,"onTime":false}]', 'listen', 'A2', 1, 1767225600000);
