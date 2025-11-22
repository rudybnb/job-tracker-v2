DROP TABLE `checkIns`;--> statement-breakpoint
DROP TABLE `progressReports`;--> statement-breakpoint
DROP TABLE `reminderLogs`;--> statement-breakpoint
ALTER TABLE `contractors` DROP INDEX `contractors_telegramChatId_unique`;--> statement-breakpoint
ALTER TABLE `contractors` DROP COLUMN `telegramChatId`;--> statement-breakpoint
ALTER TABLE `jobAssignments` DROP COLUMN `assignedRooms`;--> statement-breakpoint
ALTER TABLE `jobAssignments` DROP COLUMN `pricingModel`;--> statement-breakpoint
ALTER TABLE `jobAssignments` DROP COLUMN `hourlyRate`;--> statement-breakpoint
ALTER TABLE `jobAssignments` DROP COLUMN `pricePerRoom`;--> statement-breakpoint
ALTER TABLE `jobAssignments` DROP COLUMN `completedRooms`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `latitude`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `longitude`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `rooms`;