CREATE TABLE `leaderboard_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`week` text NOT NULL,
	`points` integer NOT NULL,
	`reached_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leaderboard_entries_week_points` ON `leaderboard_entries` (`week`,`points`);