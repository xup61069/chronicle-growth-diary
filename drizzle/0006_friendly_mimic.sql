CREATE TABLE `growth_event_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`version` int NOT NULL,
	`changeType` enum('create','update','restore') NOT NULL,
	`snapshot` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_event_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_event_revisions_event_version_idx` UNIQUE(`eventId`,`version`)
);
--> statement-breakpoint
ALTER TABLE `growth_event_revisions` ADD CONSTRAINT `growth_event_revisions_eventId_growth_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `growth_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_event_revisions_event_created_idx` ON `growth_event_revisions` (`eventId`,`createdAt`);