-- Two signed-in learners for e2e (feature 023), loaded by `pnpm e2e:seed` into
-- the e2e D1 only. `signInAs` in e2e/helpers.ts signs these session tokens; keep
-- the ids, names and tokens in step with `E2E_USERS` there.
INSERT INTO `user` (`id`, `name`, `email`, `email_verified`, `image`, `stats_opt_out`, `created_at`, `updated_at`) VALUES
  ('e2e-minh', 'Minh Anh', 'minh@e2e.test', 1, NULL, 0, 1767225600000, 1767225600000),
  ('e2e-lan', 'Lan', 'lan@e2e.test', 1, NULL, 0, 1767225600000, 1767225600000);

INSERT INTO `session` (`id`, `user_id`, `token`, `expires_at`, `ip_address`, `user_agent`, `created_at`, `updated_at`) VALUES
  ('e2e-session-minh', 'e2e-minh', 'e2e-token-minh', 4102444800000, NULL, NULL, 1767225600000, 1767225600000),
  ('e2e-session-lan', 'e2e-lan', 'e2e-token-lan', 4102444800000, NULL, NULL, 1767225600000, 1767225600000);
