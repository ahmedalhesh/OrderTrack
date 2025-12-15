-- Combined migration file for D1
-- Run this file to create all tables in D1
-- Usage: wrangler d1 execute ordertrack-db --file=./migrations/apply-to-d1.sql

-- Migration 0000: Create base tables
CREATE TABLE IF NOT EXISTS `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_number` text NOT NULL,
	`password` text NOT NULL,
	`name` text NOT NULL,
	`phone_number` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `customers_account_number_unique` ON `customers` (`account_number`);

CREATE TABLE IF NOT EXISTS `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`customer_id` integer,
	`customer_name` text NOT NULL,
	`phone_number` text NOT NULL,
	`order_status` text DEFAULT 'تم استلام الطلب' NOT NULL,
	`estimated_delivery_date` text,
	`admin_notes` text,
	`status_timestamps` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `orders_order_number_unique` ON `orders` (`order_number`);

CREATE TABLE IF NOT EXISTS `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_name` text,
	`company_logo` text,
	`company_address` text,
	`company_phone` text,
	`company_email` text,
	`company_website` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique` ON `users` (`username`);

-- Migration 0001: Add order value and items count
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- If column exists, these will fail silently or you can ignore the error
ALTER TABLE `orders` ADD COLUMN `order_value` text;
ALTER TABLE `orders` ADD COLUMN `items_count` integer;

-- Migration 0002: Add numbering settings
ALTER TABLE `settings` ADD COLUMN `order_prefix` text;
ALTER TABLE `settings` ADD COLUMN `order_start_number` integer;
ALTER TABLE `settings` ADD COLUMN `order_number_format` text;
ALTER TABLE `settings` ADD COLUMN `customer_prefix` text;
ALTER TABLE `settings` ADD COLUMN `customer_start_number` integer;
ALTER TABLE `settings` ADD COLUMN `customer_number_format` text;

-- Migration 0003: Add shipping cost
ALTER TABLE `orders` ADD COLUMN `shipping_cost` text;

