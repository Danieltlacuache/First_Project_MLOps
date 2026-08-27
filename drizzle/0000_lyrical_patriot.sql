CREATE TABLE `annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`image_id` int NOT NULL,
	`category_id` int NOT NULL,
	`bbox_x` double NOT NULL,
	`bbox_y` double NOT NULL,
	`bbox_width` double NOT NULL,
	`bbox_height` double NOT NULL,
	`area` double NOT NULL,
	`is_crowd` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `annotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`supercategory` varchar(128) NOT NULL DEFAULT 'object',
	`color` varchar(9) NOT NULL DEFAULT '#ef4444',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`object_key` varchar(512) NOT NULL,
	`width` int NOT NULL,
	`height` int NOT NULL,
	`mime_type` varchar(64) NOT NULL,
	`size_bytes` bigint NOT NULL,
	`checksum` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `images_id` PRIMARY KEY(`id`),
	CONSTRAINT `images_object_key_uq` UNIQUE(`object_key`)
);
--> statement-breakpoint
ALTER TABLE `annotations` ADD CONSTRAINT `annotations_image_id_images_id_fk` FOREIGN KEY (`image_id`) REFERENCES `images`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `annotations` ADD CONSTRAINT `annotations_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `annotations_image_idx` ON `annotations` (`image_id`);--> statement-breakpoint
CREATE INDEX `annotations_category_idx` ON `annotations` (`category_id`);