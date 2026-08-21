ALTER TABLE `growth_event_media` ADD `mediaKind` enum('image','live_motion') DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_event_media` ADD `mediaKind` enum('image','live_motion') NOT NULL DEFAULT 'image';--> statement-breakpoint
ALTER TABLE `growth_event_media` ADD `shareSafeStorageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `growth_event_media` ADD `shareSafeUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `growth_event_media` ADD `shareSafeFileName` varchar(180);--> statement-breakpoint
ALTER TABLE `growth_event_media` ADD `shareSafeMimeType` varchar(80);--> statement-breakpoint
ALTER TABLE `growth_event_media` ADD `shareSafeEnabled` boolean DEFAULT false NOT NULL;
