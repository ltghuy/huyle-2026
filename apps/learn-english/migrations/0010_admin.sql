ALTER TABLE `content_items` ADD `admin_edited_at` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `is_admin` integer DEFAULT false NOT NULL;