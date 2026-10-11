/**
 * Postgres schema. AGENTS.md "Data model" describes the same tables in prose.
 *
 * Change a table here, then run `npm run db:generate` and commit the SQL it writes to
 * `./migrations`. `npm run db:migrate` applies pending migrations.
 */

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import type { ResumeProfile, Seeking } from "../parsing/types";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const accountType = pgEnum("account_type", ["school", "recruiter"]);
export const membershipStatus = pgEnum("membership_status", ["pending", "accepted", "rejected"]);

/** What a recruiter is hiring for. Saved during setup and used as their default browse filters. */
export type HiringPreferences = { seeking: Seeking[]; gradYears: number[]; majors: string[] };

/**
 * One row per Cognito user who has picked an account type.
 * A school account is identified with its school by the primary email domain ("psu.edu").
 */
export const users = pgTable(
  "users",
  {
    /** Cognito `sub`. */
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    accountType: accountType("account_type").notNull(),
    schoolDomain: text("school_domain"),
    company: text("company"),
    jobTitle: text("job_title"),
    hiring: jsonb("hiring").$type<HiringPreferences>(),
    /** Set when the setup flow is finished; until then pages send the user to /setup. */
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    check(
      "users_school_domain_matches_type",
      sql`(${table.accountType} = 'school') = (${table.schoolDomain} is not null)`,
    ),
  ],
);

/** A club at one school, owned by the officer (a school account) who created it. */
export const clubs = pgTable(
  "clubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Globally unique: the school's domain stem, then the club name ("psu-hkn"). */
    slug: text("slug").notNull().unique(),
    schoolDomain: text("school_domain").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    /** Design-system category color; the UI owns the list. */
    hue: text("hue").notNull(),
    /** Where earnings are sent. Payouts are manual for now. */
    payoutEmail: text("payout_email").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (table) => [index("clubs_owner_id_idx").on(table.ownerId)],
);

/** Each club has exactly one book, created with the club. */
export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id")
      .notNull()
      .unique()
      .references(() => clubs.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** What a company pays to unlock the whole book. Set by the club. */
    priceCents: integer("price_cents").notNull(),
    createdAt: createdAt(),
  },
  (table) => [check("books_price_cents_non_negative", sql`${table.priceCents} >= 0`)],
);

/**
 * A student's one resume, shared by every book they join.
 *
 * `majors` and `skills` are lowercased copies for filtering; `profile` keeps the original
 * casing for display. `search_text` is the lowercased, name-free profile text that free-text
 * search matches against.
 */
export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Name as it appears once a book is unlocked. */
    contactName: text("contact_name").notNull(),
    pdfKey: text("pdf_key").notNull(),
    gradYear: integer("grad_year").notNull(),
    majors: text("majors").array().notNull(),
    seeking: text("seeking").array().notNull(),
    skills: text("skills").array().notNull(),
    profile: jsonb("profile").$type<ResumeProfile>().notNull(),
    searchText: text("search_text").notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("resumes_grad_year_idx").on(table.gradYear),
    index("resumes_majors_idx").using("gin", table.majors),
    index("resumes_seeking_idx").using("gin", table.seeking),
    index("resumes_skills_idx").using("gin", table.skills),
    index("resumes_search_text_idx").using("gin", sql`${table.searchText} gin_trgm_ops`),
  ],
);

/**
 * A resume's request to join a book. Only `accepted` memberships are visible to recruiters.
 * Leaving a book deletes the row.
 */
export const bookMembers = pgTable(
  "book_members",
  {
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    status: membershipStatus("status").notNull().default("pending"),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.bookId, table.resumeId] }),
    index("book_members_resume_status_idx").on(table.resumeId, table.status),
    index("book_members_book_status_idx").on(table.bookId, table.status),
  ],
);

/**
 * A recruiter's purchase of a whole book. This is the payout ledger, so deleting a book with
 * purchases is blocked rather than cascaded.
 */
export const unlocks = pgTable(
  "unlocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "restrict" }),
    recruiterId: text("recruiter_id")
      .notNull()
      .references(() => users.id),
    /** What the recruiter paid; the book's price can change later. */
    priceCents: integer("price_cents").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    unique("unlocks_book_recruiter_unique").on(table.bookId, table.recruiterId),
    index("unlocks_recruiter_id_idx").on(table.recruiterId),
  ],
);
