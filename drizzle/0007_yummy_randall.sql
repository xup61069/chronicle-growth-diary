CREATE TABLE `growth_diary_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('invite_created','invite_accepted','member_removed','comment_created') NOT NULL,
	`targetType` varchar(32) NOT NULL,
	`targetId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_diary_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `growth_diary_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`invitedByUserId` int NOT NULL,
	`invitedEmail` varchar(320) NOT NULL,
	`role` enum('editor','commenter') NOT NULL DEFAULT 'commenter',
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` bigint NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_diary_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_diary_invites_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `growth_diary_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('editor','commenter') NOT NULL DEFAULT 'commenter',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_diary_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_diary_members_diary_user_idx` UNIQUE(`diaryId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `growth_event_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_event_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `growth_diary_audit_logs` ADD CONSTRAINT `growth_diary_audit_logs_diaryId_growth_diaries_id_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_diary_audit_logs` ADD CONSTRAINT `growth_diary_audit_logs_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_diary_invites` ADD CONSTRAINT `growth_diary_invites_diaryId_growth_diaries_id_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_diary_invites` ADD CONSTRAINT `growth_diary_invites_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_diary_members` ADD CONSTRAINT `growth_diary_members_diaryId_growth_diaries_id_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_diary_members` ADD CONSTRAINT `growth_diary_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_event_comments` ADD CONSTRAINT `growth_event_comments_eventId_growth_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `growth_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_event_comments` ADD CONSTRAINT `growth_event_comments_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_diary_audit_diary_idx` ON `growth_diary_audit_logs` (`diaryId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `growth_diary_invites_diary_idx` ON `growth_diary_invites` (`diaryId`);--> statement-breakpoint
CREATE INDEX `growth_event_comments_event_idx` ON `growth_event_comments` (`eventId`,`createdAt`);