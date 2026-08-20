CREATE TABLE `growth_event_voice_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`fileName` varchar(180) NOT NULL,
	`mimeType` varchar(80) NOT NULL,
	`durationMs` int,
	`transcript` text NOT NULL,
	`language` varchar(16),
	`transcriptionModel` varchar(80) NOT NULL DEFAULT 'whisper-1',
	`consentedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_event_voice_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `growth_event_voice_notes` ADD CONSTRAINT `growth_event_voice_notes_eventId_growth_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `growth_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_event_voice_notes_event_idx` ON `growth_event_voice_notes` (`eventId`,`createdAt`);