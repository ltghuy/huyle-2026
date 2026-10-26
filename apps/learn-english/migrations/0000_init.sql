CREATE TABLE `content_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`level` text NOT NULL,
	`topic` text,
	`sort` integer DEFAULT 0 NOT NULL,
	`body` text NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`updated_version` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `content_items_kind_level` ON `content_items` (`kind`,`level`,`deleted`);--> statement-breakpoint
CREATE TABLE `content_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`published_at` integer NOT NULL,
	`counts` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stats_daily` (
	`day` text NOT NULL,
	`metric` text NOT NULL,
	`key` text DEFAULT '' NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`day`, `metric`, `key`)
);
--> statement-breakpoint
CREATE TABLE `stats_devices` (
	`day` text NOT NULL,
	`device_hash` text NOT NULL,
	PRIMARY KEY(`day`, `device_hash`)
);
--> statement-breakpoint
CREATE TABLE `sync_profiles` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`data` blob NOT NULL,
	`rev` integer NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
