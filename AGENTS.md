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

**v1 (built and deployed):** auth, signup and setup, clubs and join requests, PDF upload to S3 with redacted
previews (the student types the profile), the student home, search with filters, and demo accounts. Live at
https://main.d2sgexxgcmts1q.amplifyapp.com (every push to `main` deploys). Parsing and payments come next.

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
  Sandbox purchases are tests. Adam has authorized a live pilot for Co Club’s $20 book; club payouts remain manual.

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
  demo/         shared demo logins and `npm run demo:reset`
  billing/      environment-isolated checkout, paid-product verification, fee accounting (Contract 2)
  api/          the view models and functions the UI calls
```

## Design

resumes.fyi's catalog layout, Duolingo's surfaces and shapes, and Firecrawl's colors. The evidence is in the
Copycat profiles `resumes-fyi`, `duolingo`, and `firecrawl` (`~/.copycat/designs`, outside this repo). Borrow
the systems, never any brand's logo, mascot, illustrations, fonts, or copy.

- **Tokens** live in `src/frontend/styles/globals.css`. Use the role tokens (`--accent`, `--secondary`,
  `--success`, `--warning`, `--danger`, each with `-lip`, `-deep`, `-tint`, …) and neutrals, never a raw color,
  so a palette change stays in that file. Tiles, tags, and cards take a tone (`Tone` in
  `src/frontend/lib/tone.ts`): `data-tone="neutral" | "accent" | "yellow" | "ink"` sets `--face`, `--lip`,
  `--deep`, `--tint`, `--wash`, and `--soft`. Neutral is the default.
- **Surfaces:** 2px `--line` outlines, 16px radius, no drop shadows. Anything pressable sits on a solid lip (a
  thicker bottom border in a darker shade) and presses down onto it. Reuse `Button`, `SelectionCard`,
  `ToggleChip`, and `Monogram` from `src/frontend/components/ui` instead of restyling. Selected choice
  cards use a solid accent face and darker lip, not a pale tint. Selected checkout offers use white
  text; other selected choice cards use dark text.
- **Type:** Nunito. Buttons, nav, tabs, and eyebrows are 800 weight, uppercase, and tracked. Body is 16px/500.
- **Palette (Firecrawl):** red-orange, yellow, gray, and white, with pure black on rare occasions. The page is
  an off-white `--canvas` with white cards, `#262626` ink, and hairline grays.
  - Red-orange `--accent` is every primary action (Continue, Accept, Unlock), selection, focus, the active nav
    item, links, money (earnings), one key phrase in big headlines, and also `--success` and `--danger`.
  - Yellow `--warning` marks things worth noticing that aren't actions: pending, waiting, BEST VALUE, coins.
  - Clubs, companies, schools, and resume paper stay gray and white. Seeking badges use red-orange for
    internships, yellow for full-time, and gray for both. `seekingTone` keeps this consistent everywhere.
    Clubs still store a `hue`, but nothing renders it.
  - Ink (near-black on a black lip) is for `--secondary` buttons and rare heavy art: choice screens, the
    officer's own club tile, the account avatar.
- **Restraint:** solid orange is reserved for actions, selected choice cards, and the landing's closing band.
  Decorative fields use the `.grid-field` utility (Firecrawl's faint grid).
- **Contrast:** action buttons and internship badges keep the requested white-on-bright-orange treatment
  (3.3:1). Full-time badges also use white labels on yellow by request, despite the low contrast.
  Selected checkout offers use white text too; gray badges and other selected cards keep dark text.
  Other small colored text uses the `-deep` shades
  (at least 4.5:1 on white and on their tint).
  `--subtle` is for icons, borders, and placeholders; text uses `--muted` or darker.
- **Redaction is visible:** small cards use profile-drawn `RedactedResume` thumbnails with hatched identity
  bars. Expanded views show the actual redacted source pages, or the original PDF after purchase, inside
  rounded frames. Never substitute a profile drawing for a missing source document.
- **Page patterns:**
  - Browse uses a filter rail beside an equal-height CSS grid of resume cards, with a meta row outside
    each card. Shorter thumbnails leave whitespace at the bottom rather than staggering or cropping.
    Full-screen detail shows the source document on the left; the right panel has book memberships,
    education, and a purchase action that opens checkout. Do not repeat experience and skills there.
  - Onboarding (signup, setup, join) follows Duolingo: one question per screen, a progress bar on top, our mark
    asking the question in a speech bubble, and the main action in a bottom bar (`OnboardingShell`, `Prompt`).
  - Student pages (`/resume`, and `/dashboard` for a student who runs a club): stat tiles and list rows on white.
    There are two kinds of user, a student (who may run a club) and a company.
- **Motion:** quick and springy (120–320ms, `--ease-spring` for pops). The global reduced-motion rule covers it.

## Accounts

- **School account:** a verified email at a US school's domain. It can upload one resume and request to join
  books at its own school, and it can create a club. An officer is a school account that owns a club.
- **Recruiter account:** any email, plus a company. Only recruiters buy books.
- **Browse** is open to every signed-in account, students included. Names, emails, optional LinkedIn links,
  and original PDFs stay hidden until a company buys a book the resume is in. Students can add LinkedIn
  during resume review or edit/remove it on `/resume`; it is private contact data, never a search field.
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

Every page calls billing through `src/backend/billing`, via the frontend API bridge. The explicit app ARN
selects sandbox (`/sandbox`) or live (no suffix). Adam confirmed AWS permission for real payments and
approved publishing the audited app catalog. The live pilot is Co Club at $20. Only operator-prepared
`billing_products` selected by `MONETIZATION_LIVE_PRODUCT_ID`, with a metric and matching price, are purchasable; other books and new prices fail closed. Shared
demo accounts cannot make real purchases. No automatic club payouts are implemented.

- `beginCheckout(input, origin)` checks the company, accepted membership, and quoted price, then persists
  an immutable checkout before opening hosted payment. Its UUID is the provider idempotency token.
- `confirmCheckout(id)` checks ownership and server-side entitlement: `ALLOW`,
  `COVERED_BY_PURCHASED_UNITS`, and exactly the expected book/price metric with an available unit. Only then
  does it insert the unique buyer/book/environment unlock with the saved gross and fee. A deliberately free book needs
  no card. Neither a callback URL nor session creation proves payment.
- `getCheckout(id)` returns buyer-only confirmation-page data. Confirmation can lag the redirect; the page
  offers an explicit recheck. Expired unpaid sessions can be replaced; paid callbacks remain idempotent.
- `billing_products` maps each book/price to an immutable draft usage pack. Repricing never reuses a cheaper
  entitlement. No subscription or runtime publish call is made. Live products must be prepared and
  published by an authorized operator; publishing is app-wide, so inspect the entire draft first.
  Catalogs are shared across provider scopes (the beta allows only four metrics), while buyer
  entitlements remain isolated. Adam approved removing the original standalone fictional proof
  product/metric to make room for a separately named Co Club $20 live offering.
  Purchased capacity represents the book license;
  opening resumes does not consume it. The provider records the payment; Roster records the unlock.

The pinned beta SDK lacks a catalog-creation wrapper, so `provider.ts` isolates its bundled generated
command. Do not copy vendor code, publish drafts, or switch to live mode to work around provider errors.
Automatic refund/reversal handling is not implemented; the initial live pilot requires operator
reconciliation. Test and live pending intents are separate. All original purchases are marked sandbox;
`activeUnlocks()` isolates contacts, files, search counts, and earnings by environment. Never delete old
test records to enable real purchases. Migration 0006 retains the old purchase uniqueness constraint
for rolling compatibility; apply 0007 only after the mode-aware app has deployed.

**Pricing (decided by Adam):** a recruiter buys a club's entire book, once, at a price the club sets
(`books.price_cents`; clubs charge $250–$650 today). There are no single-resume purchases and no plan tiers.
Roster deducts 5% from the listed price, rounded to the nearest cent (half cents round up); the buyer
is not surcharged. A $250 book records $12.50 for Roster and $237.50 for the club, before processor costs.
`splitBookPrice` in `src/backend/billing` calculates the quote. Purchases snapshot gross and fee;
Postgres stores the club share as gross minus fee. Historical purchases retain a zero fee, and club
earnings sum their recorded club shares, never today's rate or book price. This accounting is not a payout
transfer; sandbox earnings never count as real proceeds. Real club transfers are handled manually.

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
addresses, street addresses, state + ZIP, capitalized US city/state labels (such as `Seattle, WA` and
`New York, NY`), and all linked text. City labels use valid postal abbreviations for the 50 states and DC,
start at line/column boundaries or separators, and match everywhere, including education and contact
sections. Bare cities, international formats, and unseparated employer/city text are not reliably detected.
Images (headshots) are deleted without a box, so a background image doesn't take the page's text with it.
Patterns run over whole paragraphs with line breaks preserved: wrapped addresses still match, but city
labels can't swallow the employer on the preceding line. No model is involved.
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
Run the detector and rendered-page checks with
`node --conditions=react-server --import tsx --test src/backend/redaction/redaction.test.ts`.

Rules apply when generating a preview, not when serving a stored PNG. Existing previews need regeneration
or resume resubmission to pick up new rules; resubmission replaces their S3 pages after saving succeeds.

## Data model

The source of truth is `src/backend/db/schema.ts`. After changing it, run `npm run db:generate`, commit the
SQL in `src/backend/db/migrations`, and run `npm run db:migrate`.

```
users         id (Cognito sub) PK, email unique, account_type 'school' | 'recruiter', school_domain null,
              company null, job_title null, hiring jsonb null, onboarded_at null, created_at
clubs         id, slug unique ("psu-hkn"), school_domain, name, tagline null, hue, payout_email,
              owner_id → users, created_at
books         id, club_id → clubs unique (one book per club), title, price_cents, created_at
resumes       id, user_id → users unique (one per student), contact_name, linkedin_url null, pdf_key, preview_keys text[],
              grad_year int, majors text[], seeking text[], skills text[], profile jsonb, search_text text,
              created_at, updated_at
book_members  book_id → books, resume_id → resumes, status 'pending' | 'accepted' | 'rejected',
              consented_at, requested_at, decided_at null, PK (book_id, resume_id)
unlocks       id, book_id → books, recruiter_id → users, price_cents (gross paid), platform_fee_cents,
              club_payout_cents (stored generated gross − fee), checkout_id null → book_checkouts,
              created_at, unique (book_id, recruiter_id)
billing_products id, book_id → books, app_arn, name, price_cents, metric_id null, created_at,
              unique (book_id, price_cents, app_arn)
book_checkouts id, book_id → books, recruiter_id → users, product_id null → billing_products,
              app_arn, price_cents, platform_fee_cents, return_path, callback_url, checkout_url null,
              provider_session_id null, provider_purchase_id null, expires_at null, paid_at null,
              expired_at null, created_at; at most one pending checkout per buyer/book
```

Browse only ever shows resumes with an `accepted` membership. `majors` and `skills` are stored
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
| `/browse` | any signed-in account | Cross-book search with filters; a resume opens as a redacted teaser until a company unlocks it |
| `/pricing`, `/billing` | recruiter | Delivered by the `/monetize` PR |

## Flows

**Join** (server actions): the student uploads a PDF ≤ 4 MB → put `resumes/{userId}/{uuid}.pdf` →
`await parseResume()` (~5–10 s) → the student reviews the profile and the redacted preview, ticks consent,
and picks books at their school → redact, save the resume, and add `pending` memberships. The officer
accepts or rejects on `/dashboard`. Re-uploading replaces the one resume in every book.

**Search:** any signed-in account, accepted memberships only. Any-of within school, grad year, seeking, major,
and club; skills must all match (`skills @> $1`). Free text: every word must appear in `search_text`
(trigram-indexed) or an accepted club's name. Order by grad year then newest, or newest. No ranking.

**Unlock:** persist quoted price/fee and environment → matching hosted checkout → `/checkout/[id]` → server verifies the
exact paid product → idempotent `unlocks` insert → contact info and downloads. Historical purchases remain
valid; a pending checkout does not grant access.

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
- Amplify Hosting rejects request bodies over about 4.4 MB with a 413 before the app runs, so resume PDFs
  are capped at 4 MB. The server action body limit is `'5mb'` (`serverActions.bodySizeLimit` in
  `next.config.ts`); the default is 1 MB.
- mupdf is ESM with top-level await. Load it with `await import("mupdf")`, never a static import (tsx runs
  this repo's `.ts` as CommonJS), and keep it in `serverExternalPackages` so the build traces its `.wasm`.
- Attach an IAM compute role to the Amplify app with read/write on the bucket and `bedrock:InvokeModel`.
- Never commit `.npmrc` (it holds the beta token) or real resumes. Use fake resumes when running `/monetize`.

Env vars: `DATABASE_URL`, `APP_REGION`, `RESUME_BUCKET`, `BEDROCK_MODEL_ID`,
`NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_DEMO_PASSWORD` (public on
purpose: anyone may use the demo logins), `MONETIZATION_APP_ID` (explicit live or sandbox ARN), `MONETIZATION_ENDPOINT`,
`MONETIZATION_LIVE_PRODUCT_ID` (the approved catalog product UUID; required in live mode).
Billing builds also need private `MONETIZATION_NPM_REGISTRY` and `MONETIZATION_NPM_TOKEN` values. The build
writes an ignored, mode-0600 `.npmrc`; these build credentials must never enter `.env.production` or client
assets. Keep their values outside this public repo. `infra/billing.sh <env-file> [compute-role-name]` adds
only the four required billing permissions; it does not deploy. The beta requires `Resource: "*"` because
it does not yet authorize app ARNs, so these IAM actions cover live and test monetization resources.
Roster permits only prepared live products and blocks real demo purchases. Narrow IAM resources when the provider supports it; never add
admin or publish permissions. An existing hosting environment needs those permissions and the billing
build/runtime variables before release.

Setting up an environment (each script prints env lines to append to `.env.local`, and refuses to
overwrite what exists):

- `ADMIN_DATABASE_URL=... npx tsx infra/create-database.ts`: Roster's own role and database on an RDS
  instance, then `npm run db:migrate`.
- `infra/cognito.sh [stage]`: the user pool and web client.
- `infra/s3.sh [stage]`: the private, encrypted resume bucket.
- `npm run db:seed`: invented clubs, students, and purchases (every seed account id starts with `seed:`).
  Invented seed/demo students get labeled synthetic source PDFs and redacted PNGs, not fake expanded
  documents drawn from teaser profiles. `npm run db:seed -- --remove` deletes seed rows and their files;
  do that before real launch.
- `npm run db:backfill-fake-files`: dry-run count of legacy `seed:`/`demo:` resumes with exact placeholder
  PDF keys and no previews. Add `-- --apply` to attach synthetic source PDFs/previews without a reset.
  It changes only file references, preserves IDs/profiles/timestamps/memberships/purchases, and excludes
  real Cognito users (including the shared demo logins), existing uploads, and existing previews.
  `-- --refresh-generated` dry-runs a template refresh instead: it requires owner-scoped generated
  keys and a source PDF with the synthetic label and matching profile facts. Add `--apply` to replace
  only those verified sources with the current Jake-style template and varied fictional details.
  Already-current PDFs are skipped; old generated objects are removed only after a successful CAS.
- `npm run demo:reset`: the shared demo logins `demo.officer@psu.edu` (runs Demo Club, with members, requests,
  and sales) and `demo.student@psu.edu` (a resume with redacted previews in two books), with
  `NEXT_PUBLIC_DEMO_PASSWORD`. Run it again to undo whatever visitors did; `-- --remove` deletes the data.
- `infra/amplify.sh <env-file> [stage]`: the Amplify app (GitHub `main`, auto-deploy) and its compute role.
  `infra/amplify-env.sh <app-id> <env-file>` replaces the app's env vars and redeploys.

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
