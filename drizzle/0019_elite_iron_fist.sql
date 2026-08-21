CREATE TABLE `growth_archive_restore_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restoreId` varchar(64) NOT NULL,
	`assetId` varchar(128) NOT NULL,
	`kind` enum('image','live_motion','voice','cover') NOT NULL,
	`eventArchiveId` varchar(64),
	`fileName` varchar(180) NOT NULL,
	`mimeType` varchar(80),
	`caption` varchar(240),
	`sortOrder` int,
	`durationMs` int,
	`transcript` text,
	`language` varchar(16),
	`transcriptionModel` varchar(80),
	`storageKey` varchar(512),
	`url` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_archive_restore_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_archive_restore_asset_unique_idx` UNIQUE(`restoreId`,`assetId`)
);
--> statement-breakpoint
CREATE TABLE `growth_archive_restore_sessions` (
	`id` varchar(64) NOT NULL,
	`diaryId` int NOT NULL,
	`userId` int NOT NULL,
	`payload` text NOT NULL,
	`status` enum('pending','committed','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_archive_restore_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `growth_archive_restore_assets` ADD CONSTRAINT `archive_restore_asset_session_fk` FOREIGN KEY (`restoreId`) REFERENCES `growth_archive_restore_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_archive_restore_sessions` ADD CONSTRAINT `archive_restore_session_diary_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_archive_restore_sessions` ADD CONSTRAINT `archive_restore_session_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_archive_restore_asset_restore_idx` ON `growth_archive_restore_assets` (`restoreId`);--> statement-breakpoint
CREATE INDEX `growth_archive_restore_session_diary_idx` ON `growth_archive_restore_sessions` (`diaryId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `growth_archive_restore_session_owner_idx` ON `growth_archive_restore_sessions` (`userId`,`expiresAt`);
