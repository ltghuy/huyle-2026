CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`sentence_id` text NOT NULL,
	`answer` text NOT NULL,
	`device_hash` text NOT NULL,
	`day` text NOT NULL,
	`created_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`explanation_vi` text,
	`decided_at` integer
);
--> statement-breakpoint
CREATE INDEX `claims_status` ON `claims` (`status`);--> statement-breakpoint
CREATE INDEX `claims_device_day` ON `claims` (`device_hash`,`day`);