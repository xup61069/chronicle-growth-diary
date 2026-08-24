CREATE TABLE `growth_on_this_day_feeds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`revokedAt` timestamp,
	`expiresAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_on_this_day_feeds_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_on_this_day_feeds_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `growth_on_this_day_feeds` ADD CONSTRAINT `growth_on_this_day_feeds_diaryId_growth_diaries_id_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_on_this_day_feeds_diary_idx` ON `growth_on_this_day_feeds` (`diaryId`,`revokedAt`,`expiresAt`);