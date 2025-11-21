CREATE TABLE `checkIns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractorId` int NOT NULL,
	`checkInTime` timestamp NOT NULL DEFAULT (now()),
	`checkInType` enum('login','progress_report','voice_message') NOT NULL,
	`location` text,
	`notes` text,
	CONSTRAINT `checkIns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminderLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractorId` int NOT NULL,
	`reminderType` enum('morning_checkin','daily_report') NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`responded` boolean DEFAULT false,
	`respondedAt` timestamp,
	`response` text,
	CONSTRAINT `reminderLogs_id` PRIMARY KEY(`id`)
);
