CREATE TABLE `progressReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractorId` int NOT NULL,
	`assignmentId` int NOT NULL,
	`jobId` int NOT NULL,
	`reportDate` timestamp NOT NULL,
	`phaseName` varchar(100),
	`taskName` varchar(200),
	`notes` text,
	`photoUrls` text,
	`status` enum('submitted','reviewed','approved') NOT NULL DEFAULT 'submitted',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `progressReports_id` PRIMARY KEY(`id`)
);
