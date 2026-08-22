CREATE TABLE `growth_family_milestone_audiences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`milestoneId` int NOT NULL,
	`diaryMemberId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_family_milestone_audiences_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_family_milestone_audience_unique_idx` UNIQUE(`milestoneId`,`diaryMemberId`)
);
--> statement-breakpoint
ALTER TABLE `growth_diary_audit_logs` MODIFY COLUMN `action` enum('invite_created','invite_accepted','member_role_updated','member_removed','comment_created','reaction_added','reaction_removed','family_milestone_created','family_milestone_updated','family_milestone_deleted','family_milestone_audience_updated') NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_family_milestones` ADD `audienceMode` enum('all_accepted','selected_members') DEFAULT 'all_accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_family_milestone_audiences` ADD CONSTRAINT `gfm_audience_milestone_fk` FOREIGN KEY (`milestoneId`) REFERENCES `growth_family_milestones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_family_milestone_audiences` ADD CONSTRAINT `gfm_audience_member_fk` FOREIGN KEY (`diaryMemberId`) REFERENCES `growth_diary_members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_family_milestone_audience_member_idx` ON `growth_family_milestone_audiences` (`diaryMemberId`);
