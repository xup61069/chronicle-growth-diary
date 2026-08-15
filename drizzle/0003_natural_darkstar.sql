ALTER TABLE `growth_diaries` ADD `publicCoverStorageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `publicCoverUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `publicCoverTitle` varchar(160);--> statement-breakpoint
ALTER TABLE `growth_diaries` ADD `publicStoryLayout` enum('editorial','gallery','minimal') DEFAULT 'editorial' NOT NULL;