ALTER TABLE `jobAssignments` ADD `assignedRooms` text;--> statement-breakpoint
ALTER TABLE `jobAssignments` ADD `pricingModel` enum('hourly','per_room','per_phase','fixed_price') DEFAULT 'hourly';--> statement-breakpoint
ALTER TABLE `jobAssignments` ADD `hourlyRate` int;--> statement-breakpoint
ALTER TABLE `jobAssignments` ADD `pricePerRoom` int;--> statement-breakpoint
ALTER TABLE `jobAssignments` ADD `completedRooms` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `rooms` text;