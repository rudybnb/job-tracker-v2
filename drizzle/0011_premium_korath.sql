CREATE TABLE `gpsCheckpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workSessionId` int NOT NULL,
	`contractorId` int NOT NULL,
	`timestamp` timestamp NOT NULL,
	`latitude` varchar(50) NOT NULL,
	`longitude` varchar(50) NOT NULL,
	`accuracy` varchar(50),
	`distanceFromSite` int,
	`isWithinGeofence` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gpsCheckpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taskCompletions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`contractorId` int NOT NULL,
	`phaseName` varchar(100) NOT NULL,
	`taskName` varchar(200) NOT NULL,
	`completedAt` timestamp NOT NULL,
	`notes` text,
	`photoUrls` text,
	`isVerified` int DEFAULT 0,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taskCompletions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `workSessions` ADD `assignmentId` int;--> statement-breakpoint
ALTER TABLE `workSessions` ADD `clockInAccuracy` varchar(50);--> statement-breakpoint
ALTER TABLE `workSessions` ADD `clockOutAccuracy` varchar(50);--> statement-breakpoint
ALTER TABLE `workSessions` ADD `workSitePostcode` varchar(20);--> statement-breakpoint
ALTER TABLE `workSessions` ADD `workSiteLatitude` varchar(50);--> statement-breakpoint
ALTER TABLE `workSessions` ADD `workSiteLongitude` varchar(50);--> statement-breakpoint
ALTER TABLE `workSessions` ADD `distanceFromSite` int;--> statement-breakpoint
ALTER TABLE `workSessions` ADD `isWithinGeofence` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `workSessions` ADD `hourlyRate` int;--> statement-breakpoint
ALTER TABLE `workSessions` ADD `grossPay` int;--> statement-breakpoint
ALTER TABLE `workSessions` ADD `cisDeduction` int;--> statement-breakpoint
ALTER TABLE `workSessions` ADD `netPay` int;--> statement-breakpoint
ALTER TABLE `workSessions` ADD `status` enum('active','completed','invalid') DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `workSessions` ADD `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;