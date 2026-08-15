CREATE TABLE `growth_phase_reflections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`phaseKey` varchar(32) NOT NULL,
	`recap` text NOT NULL,
	`reflection` text NOT NULL,
	`model` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_phase_reflections_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_phase_reflection_unique` UNIQUE(`diaryId`,`phaseKey`)
);
--> statement-breakpoint
CREATE TABLE `growth_share_access_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`channel` enum('public','link') NOT NULL,
	`accessedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_share_access_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `childhoodStartYear` int;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `childhoodEndYear` int;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `educationEndYear` int;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `careerEndYear` int;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `sharePasswordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `shareExpiresAt` bigint;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `shareAccessCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `lastSharedAt` timestamp;--> statement-breakpoint
ALTER TABLE `growth_phase_reflections` ADD CONSTRAINT `growth_phase_reflections_diaryId_growth_diaries_id_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_share_access_logs` ADD CONSTRAINT `growth_share_access_logs_diaryId_growth_diaries_id_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_share_access_diary_idx` ON `growth_share_access_logs` (`diaryId`,`accessedAt`);