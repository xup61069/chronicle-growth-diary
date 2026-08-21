CREATE TABLE `growth_diary_recall_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`timezoneOffsetMinutes` int NOT NULL DEFAULT 0,
	`scheduleCronTaskUid` varchar(65),
	`lastCheckedAt` bigint,
	`lastOnThisDayCount` int NOT NULL DEFAULT 0,
	`lastFutureLetterCount` int NOT NULL DEFAULT 0,
	`lastCheckStatus` varchar(32) NOT NULL DEFAULT 'never',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_diary_recall_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_diary_recall_preferences_diary_unique_idx` UNIQUE(`diaryId`)
);
--> statement-breakpoint
ALTER TABLE `growth_diary_recall_preferences` ADD CONSTRAINT `growth_diary_recall_preferences_diaryId_growth_diaries_id_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_diary_recall_preferences_task_uid_idx` ON `growth_diary_recall_preferences` (`scheduleCronTaskUid`);