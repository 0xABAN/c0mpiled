ALTER TABLE "billing_products" DROP CONSTRAINT "billing_products_sandbox_only";--> statement-breakpoint
ALTER TABLE "book_checkouts" DROP CONSTRAINT "book_checkouts_sandbox_only";--> statement-breakpoint
DROP INDEX "book_checkouts_one_pending";--> statement-breakpoint
ALTER TABLE "unlocks" ADD COLUMN "billing_mode" text DEFAULT 'sandbox' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "book_checkouts_one_pending" ON "book_checkouts" USING btree ("recruiter_id","book_id","app_arn") WHERE "book_checkouts"."paid_at" is null and "book_checkouts"."expired_at" is null;--> statement-breakpoint
ALTER TABLE "unlocks" ADD CONSTRAINT "unlocks_book_recruiter_mode_unique" UNIQUE("book_id","recruiter_id","billing_mode");--> statement-breakpoint
ALTER TABLE "billing_products" ADD CONSTRAINT "billing_products_app_arn" CHECK ("billing_products"."app_arn" ~ '^arn:aws:appmonetization:[a-z0-9-]+:[0-9]{12}:apps/[a-zA-Z0-9_-]+(/sandbox)?$');--> statement-breakpoint
ALTER TABLE "book_checkouts" ADD CONSTRAINT "book_checkouts_app_arn" CHECK ("book_checkouts"."app_arn" ~ '^arn:aws:appmonetization:[a-z0-9-]+:[0-9]{12}:apps/[a-zA-Z0-9_-]+(/sandbox)?$');--> statement-breakpoint
ALTER TABLE "unlocks" ADD CONSTRAINT "unlocks_billing_mode" CHECK ("unlocks"."billing_mode" in ('sandbox', 'live') and ("unlocks"."billing_mode" = 'sandbox' or "unlocks"."checkout_id" is not null));