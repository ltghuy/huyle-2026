DROP INDEX `leaderboard_entries_week_points`;--> statement-breakpoint
ALTER TABLE `leaderboard_entries` DROP COLUMN `week`;--> statement-breakpoint
ALTER TABLE `leaderboard_entries` DROP COLUMN `points`;