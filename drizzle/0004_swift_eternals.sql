ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique_idx` ON `users` (`email`);
