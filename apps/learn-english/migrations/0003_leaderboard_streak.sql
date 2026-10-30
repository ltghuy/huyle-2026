ALTER TABLE `leaderboard_entries` ADD `streak` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `leaderboard_entries` ADD `earned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `leaderboard_entries` ADD `last_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `leaderboard_entries_last_date_streak` ON `leaderboard_entries` (`last_date`,`streak`);