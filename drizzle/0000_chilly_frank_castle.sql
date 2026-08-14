CREATE TABLE `growth_diaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL DEFAULT '我的成長史',
	`subtitle` varchar(240),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_diaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `growth_event_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileName` varchar(180) NOT NULL,
	`mimeType` varchar(80) NOT NULL,
	`caption` varchar(240),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_event_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `growth_event_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`tagId` int NOT NULL,
	CONSTRAINT `growth_event_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_event_tags_pair_idx` UNIQUE(`eventId`,`tagId`)
);
--> statement-breakpoint
CREATE TABLE `growth_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`occurredAt` bigint NOT NULL,
	`datePrecision` enum('day','month','year') NOT NULL DEFAULT 'day',
	`eventType` enum('memory','learning','achievement','chapter') NOT NULL DEFAULT 'memory',
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`ageLabel` varchar(80),
	`place` varchar(180),
	`color` varchar(16) NOT NULL DEFAULT '#EE623B',
	`timelinePosition` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `growth_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(24) NOT NULL,
	`color` varchar(16) NOT NULL DEFAULT '#587A8B',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_tags_user_name_idx` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD CONSTRAINT `growth_diaries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_event_media` ADD CONSTRAINT `growth_event_media_eventId_growth_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `growth_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_event_tags` ADD CONSTRAINT `growth_event_tags_eventId_growth_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `growth_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_event_tags` ADD CONSTRAINT `growth_event_tags_tagId_growth_tags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `growth_tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_events` ADD CONSTRAINT `growth_events_diaryId_growth_diaries_id_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_tags` ADD CONSTRAINT `growth_tags_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_diaries_user_idx` ON `growth_diaries` (`userId`);--> statement-breakpoint
CREATE INDEX `growth_event_media_event_idx` ON `growth_event_media` (`eventId`);--> statement-breakpoint
CREATE INDEX `growth_events_diary_date_idx` ON `growth_events` (`diaryId`,`occurredAt`);