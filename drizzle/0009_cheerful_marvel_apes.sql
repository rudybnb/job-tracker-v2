ALTER TABLE `contractors` ADD `username` varchar(100);--> statement-breakpoint
ALTER TABLE `contractors` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `contractors` ADD CONSTRAINT `contractors_username_unique` UNIQUE(`username`);