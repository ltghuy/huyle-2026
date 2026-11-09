-- Removes the sample friends that dev-social.sql adds (quick 062). Local D1 only, via
-- `pnpm db:unseed:social`. Child rows are deleted explicitly rather than trusting the cascade.
DELETE FROM `notifications` WHERE `actor_id` LIKE 'dev-%' OR `user_id` LIKE 'dev-%';
DELETE FROM `friend_requests` WHERE `from_id` LIKE 'dev-%' OR `to_id` LIKE 'dev-%';
DELETE FROM `friendships` WHERE `user_id` LIKE 'dev-%' OR `friend_id` LIKE 'dev-%';
DELETE FROM `presence` WHERE `user_id` LIKE 'dev-%';
DELETE FROM `user` WHERE `id` LIKE 'dev-%';
