ALTER TABLE `contractors` ADD `paymentType` enum('day_rate','price_work') DEFAULT 'day_rate' NOT NULL;--> statement-breakpoint
ALTER TABLE `contractors` ADD `hourlyRate` int;