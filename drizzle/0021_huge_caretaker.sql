CREATE TABLE `growth_family_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`sourceEventId` int,
	`occurredAt` bigint NOT NULL,
	`datePrecision` enum('day','month','year') NOT NULL DEFAULT 'day',
	`title` varchar(180) NOT NULL,
	`summary` varchar(480) NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_family_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `growth_journey_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`startedAt` bigint NOT NULL,
	`endedAt` bigint NOT NULL,
	`coverMediaId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_journey_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_journey_details_event_unique_idx` UNIQUE(`eventId`)
);
--> statement-breakpoint
ALTER TABLE `growth_diary_audit_logs` MODIFY COLUMN `action` enum('invite_created','invite_accepted','member_role_updated','member_removed','comment_created','reaction_added','reaction_removed','family_milestone_created','family_milestone_updated','family_milestone_deleted') NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_family_milestones` ADD CONSTRAINT `growth_family_milestones_diaryId_growth_diaries_id_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_family_milestones` ADD CONSTRAINT `growth_family_milestones_sourceEventId_growth_events_id_fk` FOREIGN KEY (`sourceEventId`) REFERENCES `growth_events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_family_milestones` ADD CONSTRAINT `growth_family_milestones_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_journey_details` ADD CONSTRAINT `growth_journey_details_eventId_growth_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `growth_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_journey_details` ADD CONSTRAINT `growth_journey_details_coverMediaId_growth_event_media_id_fk` FOREIGN KEY (`coverMediaId`) REFERENCES `growth_event_media`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_family_milestones_diary_date_idx` ON `growth_family_milestones` (`diaryId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `growth_family_milestones_event_idx` ON `growth_family_milestones` (`sourceEventId`);--> statement-breakpoint
CREATE INDEX `growth_journey_details_range_idx` ON `growth_journey_details` (`startedAt`,`endedAt`);