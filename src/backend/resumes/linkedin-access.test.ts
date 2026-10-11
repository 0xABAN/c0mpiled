/**
 * Read-only presentation check using existing demo book purchases; writes no rows.
 * node --conditions=react-server --env-file=.env.local --import tsx --test src/backend/resumes/linkedin-access.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";

import { and, eq, like } from "drizzle-orm";

import { bookMembers, db, resumes, unlocks, users } from "@/backend/db";

import { presentResumes, resumeViewColumns } from "./present";

test("LinkedIn is included only in purchased contact, never in locked payloads", async () => {
  const company = await db.query.users.findFirst({ where: eq(users.email, "demo.company@example.com") });
  const student = await db.query.users.findFirst({ where: eq(users.email, "demo.student@psu.edu") });
  assert.ok(company && student, "Requires the public demo accounts; never run demo:reset to repair a test.");

  const [source] = await db.select(resumeViewColumns)
    .from(resumes)
    .innerJoin(users, eq(users.id, resumes.userId))
    .innerJoin(bookMembers, eq(bookMembers.resumeId, resumes.id))
    .innerJoin(unlocks, eq(unlocks.bookId, bookMembers.bookId))
    .where(and(like(resumes.userId, "demo:%"), eq(bookMembers.status, "accepted"), eq(unlocks.recruiterId, company.id)))
    .limit(1);
  assert.ok(source, "Requires one invented member of a purchased demo book.");

  // Inject a contact value into the presenter input, not the database or shared demo profile.
  const linkedinUrl = "https://www.linkedin.com/in/roster-access-check";
  const row = { ...source, linkedinUrl };
  const [purchased] = await presentResumes([row], company.id);
  assert.equal(purchased.contact?.linkedinUrl, linkedinUrl);

  const [locked] = await presentResumes([row], student.id);
  assert.equal(locked.contact, null);
  assert.equal(JSON.stringify(locked).includes(linkedinUrl), false, "Private link leaked outside Contact.");

  const [noLink] = await presentResumes([{ ...source, linkedinUrl: null }], company.id);
  assert.equal(noLink.contact?.linkedinUrl, null);
});
