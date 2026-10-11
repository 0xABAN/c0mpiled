CREATE TYPE "public"."account_type" AS ENUM('school', 'recruiter');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "book_members" (
	"book_id" uuid NOT NULL,
	"resume_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "book_members_book_id_resume_id_pk" PRIMARY KEY("book_id","resume_id")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"title" text NOT NULL,
	"price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_club_id_unique" UNIQUE("club_id"),
	CONSTRAINT "books_price_cents_non_negative" CHECK ("books"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"school_domain" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"hue" text NOT NULL,
	"payout_email" text NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"contact_name" text NOT NULL,
	"pdf_key" text NOT NULL,
	"grad_year" integer NOT NULL,
	"majors" text[] NOT NULL,
	"seeking" text[] NOT NULL,
	"skills" text[] NOT NULL,
	"profile" jsonb NOT NULL,
	"search_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resumes_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"recruiter_id" text NOT NULL,
	"price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unlocks_book_recruiter_unique" UNIQUE("book_id","recruiter_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"account_type" "account_type" NOT NULL,
	"school_domain" text,
	"company" text,
	"job_title" text,
	"hiring" jsonb,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_school_domain_matches_type" CHECK (("users"."account_type" = 'school') = ("users"."school_domain" is not null))
);
--> statement-breakpoint
ALTER TABLE "book_members" ADD CONSTRAINT "book_members_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_members" ADD CONSTRAINT "book_members_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocks" ADD CONSTRAINT "unlocks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlocks" ADD CONSTRAINT "unlocks_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_members_resume_status_idx" ON "book_members" USING btree ("resume_id","status");--> statement-breakpoint
CREATE INDEX "book_members_book_status_idx" ON "book_members" USING btree ("book_id","status");--> statement-breakpoint
CREATE INDEX "clubs_owner_id_idx" ON "clubs" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "resumes_grad_year_idx" ON "resumes" USING btree ("grad_year");--> statement-breakpoint
CREATE INDEX "resumes_majors_idx" ON "resumes" USING gin ("majors");--> statement-breakpoint
CREATE INDEX "resumes_seeking_idx" ON "resumes" USING gin ("seeking");--> statement-breakpoint
CREATE INDEX "resumes_skills_idx" ON "resumes" USING gin ("skills");--> statement-breakpoint
CREATE INDEX "resumes_search_text_idx" ON "resumes" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "unlocks_recruiter_id_idx" ON "unlocks" USING btree ("recruiter_id");