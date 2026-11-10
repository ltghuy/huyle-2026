CREATE TABLE `arena_match_players` (
	`match_id` text NOT NULL,
	`user_id` text NOT NULL,
	`team` text NOT NULL,
	`name` text NOT NULL,
	`image` text,
	`position` integer NOT NULL,
	PRIMARY KEY(`match_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `arena_match_players_match` ON `arena_match_players` (`match_id`);--> statement-breakpoint
ALTER TABLE `arena_matches` ADD `kind` text DEFAULT 'duel' NOT NULL;--> statement-breakpoint
ALTER TABLE `arena_matches` ADD `team` text;--> statement-breakpoint
ALTER TABLE `arena_matches` ADD `draw` integer DEFAULT false NOT NULL;