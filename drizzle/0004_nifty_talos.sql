CREATE TABLE `jobResources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` int NOT NULL,
	`orderDate` varchar(50),
	`dateRequired` varchar(50),
	`buildPhase` varchar(100),
	`typeOfResource` enum('Material','Labour') NOT NULL,
	`resourceType` varchar(100),
	`supplier` varchar(100),
	`resourceDescription` text,
	`orderQuantity` int,
	`cost` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobResources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `postCode` varchar(20);--> statement-breakpoint
ALTER TABLE `jobs` ADD `totalLabourCost` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `jobs` ADD `totalMaterialCost` int DEFAULT 0;