# Roster: club resume books for recruiters

Working name; rename freely. Built for c0mpiled (Penn State EDI, Sun Oct 11 2026), Track 2 "Build AND Sell".
Building runs 12:00–8:00 PM, and judging starts at 8:00.

## The pitch

Clubs already sell resume books, by hand. PSU Actuarial Science charges $650 for sponsorship that includes
password-protected PDFs; PSU HKN collects resumes through a Google Form; Penn SWE charges $600 for its book.
Roster replaces the Google Form, the Drive folder, and "email our corporate officer for the password":

- **Student** opts in to their club's book and gets seen by recruiters.
- **Recruiter** searches resumes across clubs, previews anonymous profiles, and subscribes to unlock books.
- **Club** earns money every time a recruiter unlocks its book.

To clubs: "Sell your book to companies that would never buy a full sponsorship. Keep your sponsorship packages."

## Scope

**In:** club creates a book, students upload with consent, officer bulk-uploads an existing book, recruiter
browses and filters anonymous teasers, recruiter subscribes (mock payments) and unlocks a book, recruiter
downloads PDFs, student withdraws, club sees earnings.

**Out:** ranking, Stripe Connect payouts (clubs are paid by hand after the event), messaging, ATS export,
resume feedback, email notifications, zip downloads.

## Team split

| Person   | Owns |
|----------|------|
| Adam     | Next.js app, AWS hosting, Postgres schema + search, auth, officer/student/recruiter pages |
| Teammate | `lib/parse.ts` (PDF → profile), `TeaserCard`, `lib/billing.ts` + `/monetize`, **selling from ~4 PM** |

The two contracts below are the seams between us. Agree on them at 12:00 and change them only together.

## Stack

- **Next.js** (App Router, TypeScript) on **Amplify Hosting**. Use npm, since the billing skill ships through
  a private npm registry.
- **RDS Postgres** (db.t4g.micro), accessed through Drizzle + `pg`. It must be *publicly accessible* with SSL
  forced and a strong password, because Amplify SSR can't reach a private VPC
  ([amplify-hosting#3362](https://github.com/aws-amplify/amplify-hosting/issues/3362)). Demo-only setup.
- **Cognito** user pool (email sign-in) with `aws-amplify` + `@aws-amplify/ui-react` `<Authenticator>` on the
  client and `@aws-amplify/adapter-nextjs` on the server. No Amplify Gen 2 backend; configure from env vars.
- **S3** private bucket for PDFs. The server uploads, and recruiters download through presigned GET URLs
  that expire after 5 minutes.
- **Bedrock** Converse API with Claude Haiku 4.5 (`us.anthropic.claude-haiku-4-5-20251001-v1:0`; confirm
  in the console). Send the PDF as a `document` block, and force a single tool call to get JSON back.
- **Billing:** AWS App Monetization private beta, run with `/monetize`. Setup steps and terms are in the
  welcome letter PDF. Don't copy them into this repo: the letter is confidential, and this repo is public.
  Payments are mocks/test cards.

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

A parse that fails sets `parse_status = 'failed'` and the officer sees a retry button. Never guess fields.

## Contract 2: billing boundary

Every page calls billing through `lib/billing.ts` and nowhere else, so the `/monetize` PR only touches
this file, the pricing page, and the billing portal.

```ts
type Plan = "recruiter" | "campus"

/** The recruiter's active plan, or null without a subscription. */
getPlan(userId: string): Promise<Plan | null>

/** Campus: always. Recruiter: while under the monthly unlock quota. */
canUnlock(userId: string, bookId: string): Promise<boolean>

/** Sends the metered "book unlock" event. Call after inserting the `unlocks` row. */
recordUnlock(userId: string, bookId: string): Promise<void>
```

Until the PR lands, a stub that returns `"campus"` unblocks the UI. Delete the stub when the PR merges.

**Plans (placeholders; let the skill recommend prices from the $250–$650 per book that clubs charge):**
Recruiter $149/mo with 2 unlocks, then $79 per extra unlock (metered). Campus $399/mo with every book.
Clubs earn a flat `CLUB_PAYOUT_PER_UNLOCK = 40` dollars, computed from `unlocks`.

## Data model

```
users    id (Cognito sub) PK, role 'officer' | 'recruiter', company text null, created_at
clubs    id, slug unique, name, owner_id → users
books    id, club_id → clubs, title ("Fall 2026"), published bool, created_at
resumes  id, book_id → books, student_name, student_email, pdf_key,
         grad_year int, majors text[], seeking text[], skills text[], profile jsonb, search_text text,
         parse_status 'pending' | 'parsed' | 'failed',
         consented_at, withdraw_token unique, withdrawn_at, created_at
unlocks  id, book_id → books, recruiter_id → users, created_at, unique (book_id, recruiter_id)
```

Withdrawn resumes are excluded from every query, and withdrawing deletes the S3 object.

## Pages

| Route | Who | What |
|-------|-----|------|
| `/` | everyone | Landing with two CTAs: "List your club's book" and "Find candidates" |
| `/onboarding` | new user | Pick officer or recruiter (recruiters enter a company) |
| `/dashboard` | officer | Create club and book, copy student link, bulk upload, resume list + parse status, unlocks + earnings |
| `/join/[bookId]` | student, no account | Name, email, PDF, consent checkbox → shows a private withdraw link |
| `/withdraw/[token]` | student | One-click removal |
| `/browse` | recruiter | Published books + cross-book search (grad year, major, seeking, skills, free text) |
| `/books/[bookId]` | recruiter | Teaser cards; after unlock, names, emails, and PDF downloads |
| `/pricing`, `/billing` | recruiter | Delivered by the `/monetize` PR |

## Flows

**Upload** (server action): validate PDF ≤ 5 MB → put `resumes/{bookId}/{uuid}.pdf` → insert row as
`pending` → `await parseResume()` (~5–10 s) → update row. Bulk upload calls the same action once per file,
4 at a time. The officer ticks a box confirming the club's original form allowed sharing with employers.

**Search:** plain SQL filters (`grad_year = any`, `majors && $1`, `seeking && $2`, `skills && $3`) plus
`search_text ilike '%q%'`. Order by grad year, then newest. No ranking.

**Unlock:** `canUnlock` → insert `unlocks` row → `recordUnlock` → page reveals contact info and downloads.

## Gotchas

- Amplify console rejects env vars starting with `AWS_`; use `APP_REGION`.
- Amplify SSR only sees server env vars written at build time: in `amplify.yml`, append them to
  `.env.production` before `npm run build`.
- Raise the server action body limit to `'5mb'` (`serverActions.bodySizeLimit` in `next.config.ts`) for
  PDF uploads; the default is 1 MB.
- Attach an IAM compute role to the Amplify app with read/write on the bucket and `bedrock:InvokeModel`.
- Never commit `.npmrc` (it holds the beta token) or real resumes. Use fake resumes when running `/monetize`.

Env vars: `DATABASE_URL`, `APP_REGION`, `RESUME_BUCKET`, `BEDROCK_MODEL_ID`,
`NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`.

## Timeline

| Time | Adam | Teammate |
|------|------|----------|
| 11:00–12:00 | Message club officers. Create RDS, S3, Cognito, and the Amplify compute role | Ask AWS team the open questions. Install the `/monetize` skill. Enable Bedrock. Make ~20 fake resume PDFs |
| 12:00–12:30 | Agree on both contracts together; scaffold the repo | ↔ |
| 12:30–1:30 | Next.js + auth + Drizzle schema, **deployed on Amplify** | `parseResume` working on the fake PDFs |
| 1:30–2:30 | `/dashboard` + `/join` (**send student links to officers by 2:30**) | Run `/monetize` on the deployed app, review and merge the PR |
| 2:30–4:00 | `/browse`, `/books/[id]`, search | `TeaserCard`, wire `lib/billing.ts`, test checkout end to end |
| 4:00–7:00 | Bug fixes, earnings view, landing page | **Sell full time** |
| 7:00–8:00 | Code freeze 7:30. Demo run-through | Traction numbers. Send the feedback log, then do the survey in one sitting (~10 min; it can't be resumed) |

## Selling

**Supply (clubs):** officers we know first, then the organizers and partners in the room: Builder's
Collective, HackPSU, Nittany AI, Google Developers Club, CCSO, MICS, Hax Club, Open Build.

**Demand (recruiters):** judges' companies (Luminal, VetRec, Unseen AI, Raya, Starborn, Cara), sponsors
(AWS, MongoDB, Bloomerang, AGI Inc), and Builder's Collective's local businesses. Ask each to sign up,
subscribe with a test card, and email a one-line commitment: "We'd pay $X/mo for this when it's live."

**Track live:** clubs onboarded, resumes uploaded, recruiters signed up, subscriptions, unlocks, commitments.

Officer message:
> Building a tool at c0mpiled today that lets companies pay to unlock your club's resume book, and the club
> gets paid per unlock. Takes 5 minutes to list your existing book. Want in?

## Demo (3 min)

1. Clubs already sell resume books through Google Forms and password-protected PDFs ($250–$650 each).
2. Officer creates a book and shares the link; a student uploads live and the teaser appears.
3. Recruiter filters across clubs, subscribes through the App Monetization checkout, unlocks, downloads.
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
