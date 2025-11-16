ALTER TABLE `contractors` ADD `telegramChatId` varchar(100);--> statement-breakpoint
ALTER TABLE `contractors` ADD CONSTRAINT `contractors_telegramChatId_unique` UNIQUE(`telegramChatId`);