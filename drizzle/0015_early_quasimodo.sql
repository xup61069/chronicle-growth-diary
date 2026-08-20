CREATE TABLE `growth_event_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`reaction` enum('heart','spark','celebrate','support') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_event_reactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_event_reactions_unique_idx` UNIQUE(`eventId`,`authorUserId`,`reaction`)
);
--> statement-breakpoint
ALTER TABLE `growth_event_reactions` ADD CONSTRAINT `growth_event_reactions_eventId_growth_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `growth_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_event_reactions` ADD CONSTRAINT `growth_event_reactions_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_event_reactions_event_idx` ON `growth_event_reactions` (`eventId`,`createdAt`);