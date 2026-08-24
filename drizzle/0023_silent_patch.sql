CREATE TABLE `growth_annual_survey_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`questionId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`responseSlot` int NOT NULL DEFAULT 0,
	`year` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_annual_survey_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_annual_survey_answers_unique_idx` UNIQUE(`surveyId`,`questionId`,`authorUserId`,`year`,`responseSlot`)
);
--> statement-breakpoint
CREATE TABLE `growth_annual_survey_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`prompt` varchar(240) NOT NULL,
	`position` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_annual_survey_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_annual_survey_questions_position_unique_idx` UNIQUE(`surveyId`,`position`)
);
--> statement-breakpoint
CREATE TABLE `growth_annual_survey_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diaryId` int NOT NULL,
	`title` varchar(120) NOT NULL DEFAULT '家庭年度問卷',
	`targetMonth` int NOT NULL DEFAULT 12,
	`targetDay` int NOT NULL DEFAULT 31,
	`remindersEnabled` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_annual_survey_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `growth_annual_survey_answers` ADD CONSTRAINT `annual_answers_survey_fk` FOREIGN KEY (`surveyId`) REFERENCES `growth_annual_survey_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_annual_survey_answers` ADD CONSTRAINT `annual_answers_question_fk` FOREIGN KEY (`questionId`) REFERENCES `growth_annual_survey_questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_annual_survey_answers` ADD CONSTRAINT `annual_answers_author_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_annual_survey_questions` ADD CONSTRAINT `annual_questions_survey_fk` FOREIGN KEY (`surveyId`) REFERENCES `growth_annual_survey_sets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_annual_survey_sets` ADD CONSTRAINT `annual_sets_diary_fk` FOREIGN KEY (`diaryId`) REFERENCES `growth_diaries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `growth_annual_survey_sets` ADD CONSTRAINT `annual_sets_creator_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `growth_annual_survey_answers_survey_year_idx` ON `growth_annual_survey_answers` (`surveyId`,`year`);--> statement-breakpoint
CREATE INDEX `growth_annual_survey_questions_survey_idx` ON `growth_annual_survey_questions` (`surveyId`);--> statement-breakpoint
CREATE INDEX `growth_annual_survey_sets_diary_idx` ON `growth_annual_survey_sets` (`diaryId`);
