ALTER TABLE `growth_diaries` ADD `birthYear` int;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `educationStartYear` int;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `careerStartYear` int;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `shareMode` enum('private','public','link') DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `shareSlug` varchar(96);--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `shareTokenHash` varchar(128);--> statement-breakpoint
ALTER TABLE `growth_events` ADD `isPublic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD CONSTRAINT `growth_diaries_shareSlug_unique` UNIQUE(`shareSlug`);