# Roster: club resume books for recruiters

Working name; rename freely. Built for [c0mpiled](https://luma.com/compiled-jjvw) (Penn State EDI, Sun Oct 11
2026), Track 2 "Build AND Sell". Building runs 12:00–8:00 PM, and judging starts at 8:00.

## The pitch

Clubs already sell resume books, by hand. PSU Actuarial Science charges $650 for sponsorship that includes
password-protected PDFs; PSU HKN collects resumes through a Google Form; Penn SWE charges $600 for its book.
Roster replaces the Google Form, the Drive folder, and "email our corporate officer for the password":

- **Student** opts in to their club's book and gets seen by recruiters.
- **Recruiter** searches resumes across clubs, previews anonymous profiles, and buys whole books.
- **Club** earns money every time a recruiter unlocks its book.

To clubs: "Sell your book to companies that would never buy a full sponsorship. Keep your sponsorship packages."

## Scope

**In:** officer creates a club (its one book comes with it), students sign up with a school email and request
to join, officer accepts or rejects, recruiter browses and filters anonymous teasers, recruiter buys a book
at the club's price (mock payments), recruiter downloads PDFs, student withdraws, club sees earnings.

**Out:** ranking, officer bulk upload, Stripe Connect payouts (clubs are paid by hand after the event),
messaging, ATS export, resume feedback, email notifications, zip downloads.

**v1 (built, local only):** auth, signup and setup, clubs and join requests, PDF upload to S3 with redacted
previews (the student types the profile), the student home, and search with filters. Parsing, payments,
and the Amplify deploy come next.

## Team split

| Person   | Owns |
|----------|------|
| Adam     | Next.js app, AWS hosting, Postgres schema + search, auth, officer/student/recruiter pages |
| Teammate | `src/backend/parsing` (PDF → profile), `src/backend/billing` + `/monetize`, **selling from ~4 PM** |

The teaser card the plan originally gave the teammate already exists as
`src/frontend/features/resumes/resume-card.tsx`.

Contracts 1 and 2 below are the seams between us. Agree on them at 12:00 and change them only together.
Contract 3 (redaction) is internal to Adam's side, between resume storage and the browse pages.

## Stack

- **Next.js** (App Router, TypeScript) on **Amplify Hosting**. Use npm, since the billing skill ships through
  a private npm registry.
- **RDS Postgres** (db.t4g.micro), accessed through Drizzle + `pg`. It must be *publicly accessible* with SSL
  forced and a strong password, because Amplify SSR can't reach a private VPC
  ([amplify-hosting#3362](https://github.com/aws-amplify/amplify-hosting/issues/3362)). Demo-only setup.
- **Cognito** user pool (email sign-in, emailed verification code) with `aws-amplify` +
  `@aws-amplify/ui-react` `<Authenticator>` on the client and `@aws-amplify/adapter-nextjs` on the server. No
  Amplify Gen 2 backend; configure from env vars. `infra/cognito.sh` creates the pool.
- **S3** private bucket for PDFs. The server uploads, and recruiters download through presigned GET URLs
  that expire after 5 minutes.
- **Bedrock** Converse API with Claude Haiku 4.5 (`us.anthropic.claude-haiku-4-5-20251001-v1:0`; confirm
  in the console). Send the PDF as a `document` block, and force a single tool call to get JSON back.
- **mupdf** (WebAssembly) redacts resumes: it finds identifying text, removes it, and renders each page to
  PNG. It's AGPL-3.0, which this public repo satisfies.
- **Billing:** AWS App Monetization private beta, run with `/monetize`. Setup steps and terms are in the
  welcome letter PDF. Don't copy them into this repo: the letter is confidential, and this repo is public.
  Payments are mocks/test cards.

Next.js is pinned to 15: Amplify Hosting SSR supports Next 12–15 only.

## Code layout

One Next app at the repo root. Import with `@/app/*`, `@/frontend/*`, `@/backend/*`.

```
src/app/        routes only; thin files that render frontend features
src/frontend/   components, features, styles; reads data only through src/frontend/lib/api
src/backend/    server-only feature modules, each with an index.ts as its public interface
  db/           Drizzle client, schema, migrations
  auth/         Cognito session on the server, requireViewer()
  schools/      US university list (Hipo dataset), email-domain checks
  accounts/     users, signup, setup
  clubs/        clubs, books, join requests
  resumes/      resumes, search, filter options
  parsing/      parseResume (teammate)
  redaction/    redactResume (Contract 3)
  storage/      resume PDFs and preview pages in S3, presigned links
  billing/      Contract 2 (teammate)
  api/          the view models and functions the UI calls
```

## Design

resumes.fyi's catalog layout with Duolingo's surfaces. The evidence for both is in the Copycat profiles
`resumes-fyi` and `duolingo` (`~/.copycat/designs`, outside this repo). Borrow the system, never either brand's
logo, mascot, illustrations, fonts, or copy.

- **Tokens** live in `src/frontend/styles/globals.css`. Use them instead of raw colors. Put `data-hue="…"` on an
  element to get `--face`, `--lip`, `--deep`, `--tint`, `--wash`, and `--soft` for that hue.
- **Surfaces:** 2px `--line` outlines, 16px radius, no drop shadows. Anything pressable sits on a solid lip (a
  thicker bottom border in a darker shade) and presses down onto it. Reuse `Button`, `SelectionCard`,
  `ToggleChip`, and `Monogram` from `src/frontend/components/ui` instead of restyling.
- **Type:** Nunito. Buttons, nav, tabs, and eyebrows are 800 weight, uppercase, and tracked. Body is 16px/500.
- **Color roles:** green is progress (Continue, Accept, Download). Blue is secondary actions, selection, links, and
  the active nav item. Indigo is money only (unlock, purchase). The other hues are categories: what a candidate
  seeks (internship blue, full-time orange, both purple) and each club's own color.
- **Contrast:** bright faces with white labels only on large buttons and art. Small colored text and tags use
  `--{hue}-deep` (at least 4.5:1 on white and on the hue's tint). `--subtle` is for icons, borders, and
  placeholders; text uses `--muted` or darker.
- **Redaction is visible:** hidden text is a dark hatched bar (`RedactedResume`, drawn from the profile). Cards
  always use it; the detail view shows Contract 3's redacted pages when a resume has them.
- **Page patterns:**
  - Recruiter pages (browse, detail, unlock) follow resumes.fyi: a filter rail beside a masonry grid of
    hue-tinted cards, a meta row outside each card, and a full-screen detail with the document on the left and
    an info panel on the right.
  - Onboarding (signup, setup, join) follows Duolingo: one question per screen, a progress bar on top, our mark
    asking the question in a speech bubble, and the main action in a bottom bar (`OnboardingShell`, `Prompt`).
  - Officer and student pages: stat tiles and list rows on white.
- **Motion:** quick and springy (120–320ms, `--ease-spring` for pops). The global reduced-motion rule covers it.

## Accounts

- **School account:** a verified email at a US school's domain. It can upload one resume and request to join
  books at its own school, and it can create a club. An officer is a school account that owns a club.
- **Recruiter account:** any email, plus a company. Only signed-in recruiters can browse.
- Signup: choose school or recruiter → school accounts type their school and must use one of its email
  domains → Cognito sends a code → setup. The server rechecks the verified email against the school's
  domains before creating the account.

## Contract 1: parser output

```ts
/** What `parseResume(pdf)` returns. Only `profile` is shown before a book is unlocked. */
type ParsedResume = {
  contact: { name: string; email: string | null }
  profile: ResumeProfile
}

type ResumeProfile = {
  gradYear: number
  majors: string[]
  degree: "BS" | "MS" | "PhD"
  seeking: ("internship" | "full-time")[]
  skills: string[]                              // at most 12
  experience: { title: string; org: string }[]  // at most 3, most recent first
}
```

When a parse fails, the student fills in the profile by hand. Never guess fields. The resume row is only
saved after the student has reviewed the profile. The types live in `src/backend/parsing/types.ts`.

## Contract 2: billing boundary

Every page calls billing through `src/backend/billing` and nowhere else, so the `/monetize` PR only touches
this file, the pricing page, and the billing portal.

```ts
/** Whether the recruiter may unlock this book now (e.g. payment went through). */
canUnlock(userId: string, bookId: string): Promise<boolean>

/** Reports the book purchase to billing. Call after inserting the `unlocks` row. */
recordUnlock(userId: string, bookId: string): Promise<void>
```

Until the PR lands, a stub where `canUnlock` returns `true` unblocks the UI. Delete the stub when the PR
merges.

**Pricing (decided by Adam):** a recruiter buys a club's entire book, once, at a price the club sets
(`books.price_cents`; clubs charge $250–$650 today). There are no single-resume purchases and no plan tiers.
The club earns what the recruiter paid; any platform fee is undecided. Open for the teammate: how a
club-set, per-book price maps onto App Monetization. Confirm with the AWS team before running `/monetize`.

## Contract 3: redaction

Before buying a book, recruiters read each student's real resume with everything that identifies the
student blacked out. `src/backend/redaction` produces it, the backend stores it, and the frontend shows it.
The module is pure (bytes in, bytes out) and never touches S3, the database, or auth.

```ts
/**
 * One PNG per page with the student's identity blacked out. Throws UserError when the student
 * must fix the PDF (scanned, locked, over 3 pages, or `name` not on it as typed), and Error if
 * identifying text survives redaction.
 */
redactResume(pdf: Uint8Array, student: { name: string }): Promise<Uint8Array[]>
```

It blacks out each part of the name (whole words, ignoring case and accents), emails, phone numbers, web
addresses, street addresses, state + ZIP, and all linked text. Images (headshots) are deleted without a box,
so a background image doesn't take the page's text with it. Patterns run over whole paragraphs, so a wrapped
address still matches, and they lean toward hiding too much. No model is involved.
Pages are images, so no text layer, metadata, or link target survives. After redacting, it reads each page
back and throws if anything still matches.

- **Review step:** `previewRedaction(uploadId, name)` returns the pages as data URLs and saves nothing, so
  the student sees exactly what recruiters will see before ticking consent.
- **Submit:** `submitResume` redacts again with the submitted name (fast and deterministic), puts
  `previews/{userId}/{uuid}/{n}.png` next to the original PDF, and saves `resumes.preview_keys`.
- **Browse:** `GET /api/resumes/[id]/preview/[page]` checks access, then redirects to a presigned S3 URL that
  expires after 5 minutes, like the PDF route. Before unlock, the detail view shows these pages and cards
  keep the profile-drawn `RedactedResume`. After unlock, the original PDF replaces them.

`npm run redact -- fake.pdf "Full Name" [out-dir]` redacts one PDF from the command line.

## Data model

The source of truth is `src/backend/db/schema.ts`. After changing it, run `npm run db:generate`, commit the
SQL in `src/backend/db/migrations`, and run `npm run db:migrate`.

```
users         id (Cognito sub) PK, email unique, account_type 'school' | 'recruiter', school_domain null,
              company null, job_title null, hiring jsonb null, onboarded_at null, created_at
clubs         id, slug unique ("psu-hkn"), school_domain, name, tagline null, hue, payout_email,
              owner_id → users, created_at
books         id, club_id → clubs unique (one book per club), title, price_cents, created_at
resumes       id, user_id → users unique (one per student), contact_name, pdf_key, preview_keys text[],
              grad_year int, majors text[], seeking text[], skills text[], profile jsonb, search_text text,
              created_at, updated_at
book_members  book_id → books, resume_id → resumes, status 'pending' | 'accepted' | 'rejected',
              consented_at, requested_at, decided_at null, PK (book_id, resume_id)
unlocks       id, book_id → books, recruiter_id → users, price_cents (what was paid), created_at,
              unique (book_id, recruiter_id)
```

Recruiters only ever see resumes with an `accepted` membership. `majors` and `skills` are stored
lowercased for filtering; `profile` keeps the original casing for display. A school is identified by its
primary email domain ("psu.edu").

## Pages

| Route | Who | What |
|-------|-----|------|
| `/` | everyone | Landing with two CTAs: "List your club's book" and "Find candidates" |
| `/signup`, `/login` | everyone | School or recruiter → school typeahead → themed `<Authenticator>` |
| `/setup` | new account | School: create a club and/or add a resume and request books. Recruiter: company, title, hiring defaults |
| `/dashboard` | officer | Copy join link, accept or reject join requests, members, unlocks + earnings |
| `/join/[slug]` | school account | Request to join this club's book with your resume (consent checkbox) |
| `/browse` | recruiter | Cross-book search with filters; a resume opens as a redacted teaser until unlocked |
| `/pricing`, `/billing` | recruiter | Delivered by the `/monetize` PR |

## Flows

**Join** (server actions): the student uploads a PDF ≤ 5 MB → put `resumes/{userId}/{uuid}.pdf` →
`await parseResume()` (~5–10 s) → the student reviews the profile and the redacted preview, ticks consent,
and picks books at their school → redact, save the resume, and add `pending` memberships. The officer
accepts or rejects on `/dashboard`. Re-uploading replaces the one resume in every book.

**Search:** recruiters only, accepted memberships only. Any-of within school, grad year, seeking, major,
and club; skills must all match (`skills @> $1`). Free text: every word must appear in `search_text`
(trigram-indexed) or an accepted club's name. Order by grad year then newest, or newest. No ranking.

**Unlock:** `canUnlock` → insert `unlocks` row → `recordUnlock` → page reveals contact info and downloads.

**Withdraw:** leaving a book deletes the membership; deleting the resume deletes the S3 objects (the PDF
and its preview pages), the row, and every membership.

## Gotchas

- Amplify console rejects env vars starting with `AWS_`; use `APP_REGION`.
- Amplify Hosting doesn't support Edge middleware. Pages check the session server-side through
  `src/backend/auth` instead.
- Cognito's default email sender is capped at 50 emails a day per AWS account, and the cap can't be raised.
  Switch the pool to SES before real launch.
- Amplify SSR only sees server env vars written at build time: in `amplify.yml`, append them to
  `.env.production` before `npm run build`.
- Raise the server action body limit to `'5mb'` (`serverActions.bodySizeLimit` in `next.config.ts`) for
  PDF uploads; the default is 1 MB.
- mupdf is ESM with top-level await. Load it with `await import("mupdf")`, never a static import (tsx runs
  this repo's `.ts` as CommonJS), and keep it in `serverExternalPackages` so the build traces its `.wasm`.
- Attach an IAM compute role to the Amplify app with read/write on the bucket and `bedrock:InvokeModel`.
- Never commit `.npmrc` (it holds the beta token) or real resumes. Use fake resumes when running `/monetize`.

Env vars: `DATABASE_URL`, `APP_REGION`, `RESUME_BUCKET`, `BEDROCK_MODEL_ID`,
`NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`.

Setting up an environment (each script prints env lines to append to `.env.local`, and refuses to
overwrite what exists):

- `ADMIN_DATABASE_URL=... npx tsx infra/create-database.ts`: Roster's own role and database on an RDS
  instance, then `npm run db:migrate`.
- `infra/cognito.sh [stage]`: the user pool and web client.
- `infra/s3.sh [stage]`: the private, encrypted resume bucket.
- `npm run db:seed`: invented clubs, students, and purchases (every seed account id starts with `seed:`).
  `npm run db:seed -- --remove` deletes them; do that before real launch.

Test accounts: create them with `aws cognito-idp admin-create-user --message-action SUPPRESS` and
`admin-set-user-password --permanent`, so they don't spend the 50-emails-a-day Cognito quota.

## Timeline

| Time | Adam | Teammate |
|------|------|----------|
| 11:00–12:00 | Message club officers. Create RDS, S3, Cognito, and the Amplify compute role | Ask AWS team the open questions. Install the `/monetize` skill. Enable Bedrock. Make ~20 fake resume PDFs |
| 12:00–12:30 | Agree on both contracts together; scaffold the repo | ↔ |
| 12:30–1:30 | Next.js + auth + Drizzle schema, **deployed on Amplify** | `parseResume` working on the fake PDFs |
| 1:30–2:30 | `/dashboard` + `/join` (**send student links to officers by 2:30**) | Run `/monetize` on the deployed app, review and merge the PR |
| 2:30–4:00 | `/browse`, search | wire `src/backend/billing`, test checkout end to end |
| 4:00–7:00 | Bug fixes, earnings view, landing page | **Sell full time** |
| 7:00–8:00 | Code freeze 7:30. Demo run-through | Traction numbers. Send the feedback log, then do the survey in one sitting (~10 min; it can't be resumed) |

## Selling

**Supply (clubs):** officers we know first, then the organizers and partners in the room: Builder's
Collective, HackPSU, Nittany AI, Google Developers Club, CCSO, MICS, Hax Club, Open Build.

**Demand (recruiters):** judges' companies (Luminal, VetRec, Unseen AI, Raya, Starborn, Cara), sponsors
(AWS, MongoDB, Bloomerang, AGI Inc), and Builder's Collective's local businesses. Ask each to sign up,
buy a book with a test card, and email a one-line commitment: "We'd pay $X for this book when it's live."

**Track live:** clubs onboarded, resumes uploaded, recruiters signed up, book purchases, commitments.

Officer message:
> Building a tool at c0mpiled today that lets companies pay to unlock your club's resume book, and the club
> gets paid per unlock. Takes 5 minutes to list your existing book. Want in?

## Demo (3 min)

1. Clubs already sell resume books through Google Forms and password-protected PDFs ($250–$650 each).
2. Officer creates a book and shares the link; a student uploads live and the teaser appears.
3. Recruiter filters across clubs, buys a book through the App Monetization checkout, downloads.
4. The club dashboard shows earnings.
5. Traction: real clubs, real resumes, real recruiter signups and commitments.

## Prizes to claim

- **AWS ($3k / $1.5k / $500):** publish a plan, register for payments, complete one transaction with an end
  user, email the feedback log, finish the survey (also earns a $50 gift card).
- **Sales story ($1.5k / $1k / $500):** the traction numbers above.
- **Bloomerang ($1k / $600 / $400):** clubs are student nonprofits funding themselves.

## Open questions (answer before 12:30)

- Which identity providers does App Monetization metering support? This plan assumes Cognito.
- Does `/monetize` handle Amplify Hosting + RDS as the infrastructure it scans?
- Confirm with the AWS team that test-card transactions satisfy the prize requirement.
