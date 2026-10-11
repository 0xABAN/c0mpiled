/**
 * Add/refresh source files only for invented resumes, without resetting application data.
 *
 *   npm run db:backfill-fake-files                        dry-run legacy placeholders
 *   npm run db:backfill-fake-files -- --refresh-generated dry-run verified generated PDFs
 *   Add --apply to either mode to write files and attach them.
 *
 * Refresh requires seed:/demo: IDs, owner-scoped generated keys, and a source PDF explicitly
 * labeled synthetic with matching identity/profile facts. Real Cognito users, including shared
 * demo logins, never qualify. Only file references change; all other rows and fields stay put.
 */
import { and, eq, like, or } from "drizzle-orm";

import { findSchool } from "@/backend/schools";
import { deleteFiles, getResumePdf } from "@/backend/storage";

import { createDatabase } from "./client";
import { hasGeneratedFakeKeys, inspectFakeSource, isLegacyFakeResume, storeFakeResumeFiles } from "./fake/resume-files";
import { TEMPLATE_VERSION } from "./fake/resume-pdf";
import { resumes, users } from "./schema";

async function main() {
  const args = process.argv.slice(2);
  if (new Set(args).size !== args.length || args.some((arg) => arg !== "--apply" && arg !== "--refresh-generated")) {
    throw new Error("Allowed flags: --apply, --refresh-generated. Without --apply, nothing is written.");
  }
  const apply = args.includes("--apply");
  const refresh = args.includes("--refresh-generated");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Use npm run db:backfill-fake-files.");

  const { db, pool } = createDatabase(url);

  try {
    const rows = await db
      .select({ resume: resumes, email: users.email, schoolDomain: users.schoolDomain })
      .from(resumes)
      .innerJoin(users, eq(users.id, resumes.userId))
      .where(or(like(resumes.userId, "seed:%"), like(resumes.userId, "demo:%")))
      .orderBy(resumes.userId);

    const candidates = [];
    let current = 0;
    let skipped = 0;
    for (const row of rows) {
      const { resume, email, schoolDomain } = row;
      if (!(refresh ? hasGeneratedFakeKeys(resume) : isLegacyFakeResume(resume))) {
        skipped++;
        continue;
      }
      const school = schoolDomain && findSchool(schoolDomain);
      if (!school) throw new Error(`Unknown school for invented resume ${resume.id}; nothing guessed.`);
      const student = { userId: resume.userId, name: resume.contactName, email, school: school.name, profile: resume.profile };

      if (refresh) {
        const pdf = await getResumePdf(resume.pdfKey);
        if (!pdf) throw new Error(`Missing source for ${resume.userId}; refusing to guess its provenance.`);
        const source = await inspectFakeSource(pdf, student);
        if (!source.generated) {
          console.log(`Skipped ${resume.userId}: source is not a verified synthetic resume.`);
          skipped++;
          continue;
        }
        if (source.creator === TEMPLATE_VERSION) {
          current++;
          continue;
        }
      }
      candidates.push({ resume, student });
    }

    console.log(`${apply ? "Apply" : "Dry run"}: ${candidates.length} ${refresh ? "verified generated sources" : "legacy placeholders"} qualify; ${current} already current; ${skipped} skipped.`);
    if (!apply) {
      console.log("No files or rows changed. Add --apply to perform this operation.");
      return;
    }

    for (const { resume, student } of candidates) {
      const files = await storeFakeResumeFiles(student);

      // Compare-and-set: an upload or other edit during generation must win over backfill.
      // On a database error, retain new objects: an uncertain commit may reference them.
      const updated = await db
        .update(resumes)
        .set(files)
        .where(and(
          eq(resumes.id, resume.id),
          eq(resumes.userId, resume.userId),
          eq(resumes.pdfKey, resume.pdfKey),
          eq(resumes.previewKeys, resume.previewKeys),
          eq(resumes.contactName, resume.contactName),
          eq(resumes.profile, resume.profile),
          eq(resumes.updatedAt, resume.updatedAt),
        ))
        .returning({ id: resumes.id });

      if (updated.length !== 1) {
        await deleteFiles([files.pdfKey, ...files.previewKeys]);
        throw new Error(`Resume ${resume.id} changed during generation; no row overwritten. Rerun the dry run.`);
      }
      // These old objects were verified as generated above and are no longer referenced.
      if (refresh) await deleteFiles([resume.pdfKey, ...resume.previewKeys]);
      console.log(`Updated ${resume.userId}: ${files.previewKeys.length} preview page(s).`);
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
