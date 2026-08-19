ALTER TABLE `growth_events` ADD `mapLatitudeE6` int;--> statement-breakpoint
ALTER TABLE `growth_events` ADD `mapLongitudeE6` int;--> statement-breakpoint
ALTER TABLE `growth_events` ADD `locationPrivacy` enum('none','city','precise') DEFAULT 'none' NOT NULL;