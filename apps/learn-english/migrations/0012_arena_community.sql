CREATE TABLE `arena_community` (
	`code` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`level` text NOT NULL,
	`host_id` text NOT NULL,
	`host_name` text NOT NULL,
	`host_image` text,
	`settings` text NOT NULL,
	`taken` integer NOT NULL,
	`seats` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `arena_community_updated` ON `arena_community` (`updated_at`);