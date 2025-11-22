DROP TABLE `progressReportSessions`;--> statement-breakpoint
ALTER TABLE `jobAssignments` DROP COLUMN `acknowledged`;--> statement-breakpoint
ALTER TABLE `jobAssignments` DROP COLUMN `acknowledgedAt`;--> statement-breakpoint
ALTER TABLE `jobAssignments` DROP COLUMN `notifiedAt`;