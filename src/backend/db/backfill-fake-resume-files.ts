/**
 * Add source PDFs/previews only to legacy invented resumes, without resetting any data.
 *
 *   npm run db:backfill-fake-files             dry run, no uploads or writes
 *   npm run db:backfill-fake-files -- --apply  create files and attach them
 *
 * Only seed:/demo: people with their exact old placeholder key and no previews qualify.
 * Real Cognito users (including shared demo logins), uploaded PDFs, and existing previews
 * are never replaced. Resume IDs, profiles, timestamps, memberships and purchases stay put.
 */
import { and, eq, like, or, sql } from "drizzle-orm";

import { findSchool } from "@/backend/schools";
import { deleteFiles } from "@/backend/storage";

import { createDatabase } from "./client";
import { isLegacyFakeResume, storeFakeResumeFiles } from "./fake/resume-files";
import { resumes, users } from "./schema";

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--apply")) {
    throw new Error("Use no arguments for a dry run, or --apply. This command never resets data.");
  }
  const apply = args[0] === "--apply";
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Use npm run db:backfill-fake-files.");

  const { db, pool } = createDatabase(url);
  const noPreviews = sql`cardinality(${resumes.previewKeys}) = 0`;

  try {
    const rows = await db
      .select({ resume: resumes, email: users.email, schoolDomain: users.schoolDomain })
      .from(resumes)
      .innerJoin(users, eq(users.id, resumes.userId))
      .where(and(or(like(resumes.userId, "seed:%"), like(resumes.userId, "demo:%")), noPreviews))
      .orderBy(resumes.userId);

    const candidates = rows.filter(({ resume }) => isLegacyFakeResume(resume));
    console.log(`${apply ? "Apply" : "Dry run"}: ${candidates.length} legacy invented resumes qualify; ${rows.length - candidates.length} other file references skipped.`);
    if (!apply) {
      console.log("No files or rows changed. Add -- --apply to backfill these placeholders.");
      return;
    }

    for (const { resume, email, schoolDomain } of candidates) {
      const school = schoolDomain && findSchool(schoolDomain);
      if (!school) throw new Error(`Unknown school for invented resume ${resume.id}; nothing guessed.`);

      const files = await storeFakeResumeFiles({
        userId: resume.userId,
        name: resume.contactName,
        email,
        school: school.name,
        profile: resume.profile,
      });

      // Compare-and-set: an upload or other edit during generation must win over backfill.
      // On a database error, retain the new objects: an uncertain commit may reference them.
      const updated = await db
        .update(resumes)
        .set(files)
        .where(and(
          eq(resumes.id, resume.id),
          eq(resumes.userId, resume.userId),
          eq(resumes.pdfKey, resume.pdfKey),
          eq(resumes.contactName, resume.contactName),
          eq(resumes.profile, resume.profile),
          eq(resumes.updatedAt, resume.updatedAt),
          noPreviews,
        ))
        .returning({ id: resumes.id });

      if (updated.length !== 1) {
        await deleteFiles([files.pdfKey, ...files.previewKeys]);
        throw new Error(`Resume ${resume.id} changed during backfill; no row overwritten. Rerun the dry run.`);
      }
      console.log(`Backfilled ${resume.userId}: ${files.previewKeys.length} preview page(s).`);
    }
    console.log(`Done: attached source files to ${candidates.length} invented resumes. No reset performed.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
