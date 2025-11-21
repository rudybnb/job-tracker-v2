ALTER TABLE `jobAssignments` ADD `acknowledged` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `jobAssignments` ADD `acknowledgedAt` timestamp;