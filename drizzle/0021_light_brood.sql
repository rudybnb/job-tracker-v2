CREATE TABLE `progressReportSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatId` varchar(50) NOT NULL,
	`contractorId` int,
	`step` varchar(50) NOT NULL DEFAULT 'idle',
	`workCompleted` text,
	`progressPercentage` int,
	`issues` text,
	`materials` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`expiresAt` timestamp,
	CONSTRAINT `progressReportSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `progressReportSessions_chatId_unique` UNIQUE(`chatId`)
);
