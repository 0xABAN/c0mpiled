-- Preserve historical purchases without a retroactive fee. New inserts must choose a fee explicitly.
ALTER TABLE "unlocks" ADD COLUMN "platform_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "unlocks" ALTER COLUMN "platform_fee_cents" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "unlocks" ADD COLUMN "club_payout_cents" integer GENERATED ALWAYS AS ("price_cents" - "platform_fee_cents") STORED NOT NULL;--> statement-breakpoint
ALTER TABLE "unlocks" ADD CONSTRAINT "unlocks_fee_within_price" CHECK ("unlocks"."platform_fee_cents" between 0 and "unlocks"."price_cents");