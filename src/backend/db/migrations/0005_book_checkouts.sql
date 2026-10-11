CREATE TABLE "billing_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"app_arn" text NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer NOT NULL,
	"metric_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_products_book_price_app_unique" UNIQUE("book_id","price_cents","app_arn"),
	CONSTRAINT "billing_products_positive_price" CHECK ("billing_products"."price_cents" > 0),
	CONSTRAINT "billing_products_sandbox_only" CHECK ("billing_products"."app_arn" like '%/sandbox')
);
--> statement-breakpoint
CREATE TABLE "book_checkouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"recruiter_id" text NOT NULL,
	"product_id" uuid,
	"app_arn" text NOT NULL,
	"price_cents" integer NOT NULL,
	"platform_fee_cents" integer NOT NULL,
	"return_path" text NOT NULL,
	"callback_url" text NOT NULL,
	"checkout_url" text,
	"provider_session_id" text,
	"provider_purchase_id" text,
	"expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_checkouts_fee_within_price" CHECK ("book_checkouts"."platform_fee_cents" between 0 and "book_checkouts"."price_cents"),
	CONSTRAINT "book_checkouts_product_for_paid_book" CHECK (("book_checkouts"."price_cents" = 0) = ("book_checkouts"."product_id" is null)),
	CONSTRAINT "book_checkouts_sandbox_only" CHECK ("book_checkouts"."app_arn" like '%/sandbox')
);
--> statement-breakpoint
ALTER TABLE "unlocks" ADD COLUMN "checkout_id" uuid;--> statement-breakpoint
ALTER TABLE "billing_products" ADD CONSTRAINT "billing_products_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_checkouts" ADD CONSTRAINT "book_checkouts_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_checkouts" ADD CONSTRAINT "book_checkouts_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_checkouts" ADD CONSTRAINT "book_checkouts_product_id_billing_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."billing_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_checkouts_one_pending" ON "book_checkouts" USING btree ("recruiter_id","book_id") WHERE "book_checkouts"."paid_at" is null and "book_checkouts"."expired_at" is null;--> statement-breakpoint
ALTER TABLE "unlocks" ADD CONSTRAINT "unlocks_checkout_id_book_checkouts_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."book_checkouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocks" ADD CONSTRAINT "unlocks_checkout_id_unique" UNIQUE("checkout_id");