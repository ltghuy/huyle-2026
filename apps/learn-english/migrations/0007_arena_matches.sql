CREATE TABLE `arena_matches` (
	`match_id` text NOT NULL,
	`user_id` text NOT NULL,
	`opponent_id` text,
	`opponent_name` text,
	`opponent_image` text,
	`won` integer NOT NULL,
	`forfeit` integer NOT NULL,
	`rounds_won` integer NOT NULL,
	`opponent_rounds_won` integer NOT NULL,
	`rounds` text NOT NULL,
	`mode` text NOT NULL,
	`level` text NOT NULL,
	`best_of` integer NOT NULL,
	`ended_at` integer NOT NULL,
	PRIMARY KEY(`match_id`, `user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opponent_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `arena_matches_user_ended` ON `arena_matches` (`user_id`,`ended_at`);