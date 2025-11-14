CREATE TABLE `buildPhases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`phaseName` varchar(100) NOT NULL,
	`tasks` text,
	`status` enum('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buildPhases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `csvUploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`uploadedBy` int NOT NULL,
	`jobsCreated` int NOT NULL DEFAULT 0,
	`status` enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `csvUploads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`phaseId` int,
	`type` enum('labour','material') NOT NULL,
	`amount` int NOT NULL,
	`description` text,
	`date` timestamp NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobBudgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`clientId` int,
	`totalBudget` int NOT NULL DEFAULT 0,
	`labourBudget` int NOT NULL DEFAULT 0,
	`materialBudget` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobBudgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobBudgets_jobId_unique` UNIQUE(`jobId`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`address` text,
	`projectType` varchar(100),
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`assignedContractorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `phaseBudgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phaseId` int NOT NULL,
	`labourBudget` int NOT NULL DEFAULT 0,
	`materialBudget` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phaseBudgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `phaseBudgets_phaseId_unique` UNIQUE(`phaseId`)
);
--> statement-breakpoint
CREATE TABLE `workSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`contractorId` int NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','contractor') NOT NULL DEFAULT 'user';