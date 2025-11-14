CREATE TABLE `contractors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`type` enum('contractor','subcontractor') NOT NULL,
	`primaryTrade` varchar(100),
	`dailyRate` int,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contractors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`contractorId` int NOT NULL,
	`workLocation` text,
	`selectedPhases` text,
	`startDate` timestamp,
	`endDate` timestamp,
	`specialInstructions` text,
	`status` enum('assigned','in_progress','completed','cancelled') NOT NULL DEFAULT 'assigned',
	`milestonePrice` int,
	`teamAssignment` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `workSessions` ADD `clockInLatitude` varchar(50);--> statement-breakpoint
ALTER TABLE `workSessions` ADD `clockInLongitude` varchar(50);--> statement-breakpoint
ALTER TABLE `workSessions` ADD `clockOutLatitude` varchar(50);--> statement-breakpoint
ALTER TABLE `workSessions` ADD `clockOutLongitude` varchar(50);--> statement-breakpoint
ALTER TABLE `workSessions` ADD `hoursWorked` int;--> statement-breakpoint
ALTER TABLE `workSessions` ADD `amountEarned` int;