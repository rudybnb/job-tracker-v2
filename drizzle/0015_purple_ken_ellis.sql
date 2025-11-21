ALTER TABLE `progressReports` ADD `audioUrl` text;--> statement-breakpoint
ALTER TABLE `progressReports` ADD `originalLanguage` varchar(10);--> statement-breakpoint
ALTER TABLE `progressReports` ADD `transcribedText` text;--> statement-breakpoint
ALTER TABLE `progressReports` ADD `transcriptionDuration` int;