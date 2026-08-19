ALTER TABLE `growth_events` ADD `track` enum('career','skills','life','hardware') DEFAULT 'life' NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_events` ADD `milestoneType` enum('standard','highlight','turning_point','gear_workflow','reflection') DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_events` ADD `milestoneWeight` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_events` ADD `comparisonGroup` varchar(96);--> statement-breakpoint
ALTER TABLE `growth_events` ADD `unlocksAt` bigint;--> statement-breakpoint
ALTER TABLE `growth_tags` ADD `kind` enum('general','skill') DEFAULT 'general' NOT NULL;