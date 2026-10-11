/**
 * Append three fictional volunteers to the existing Demo Club, never reset or update data.
 * Dry-run by default; --apply uploads synthetic sources and inserts the missing demo rows.
 *
 * node --conditions=react-server --env-file=.env.local --import tsx src/backend/demo/add-volunteers.ts [--apply]
 */
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, eq, inArray } from "drizzle-orm";

import { createDatabase, type Database } from "@/backend/db/client";
import { hasGeneratedFakeKeys, storeFakeResumeFiles } from "@/backend/db/fake/resume-files";
import { VOLUNTEER_STUDENTS } from "@/backend/db/fake/volunteers";
import { bookMembers, books, clubs, resumes, users } from "@/backend/db/schema";
import { resumeColumns } from "@/backend/resumes/columns";
import { deleteFiles } from "@/backend/storage";

import { DEMO_ACCOUNTS } from "./accounts";

/** Require the known sample club AND its public demo owner; never create or relabel a club. */
function demoBook(database: Database) {
  return database.select({ bookId: books.id })
    .from(books)
    .innerJoin(clubs, eq(clubs.id, books.clubId))
    .innerJoin(users, eq(users.id, clubs.ownerId))
    .where(and(eq(clubs.slug, "psu-demo-club"), eq(clubs.schoolDomain, "psu.edu"), eq(users.email, DEMO_ACCOUNTS.student)));
}

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== "--apply")) throw new Error("Only --apply is supported; omit it for a dry run.");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  const { db, pool } = createDatabase(url);

  try {
    const [target] = await demoBook(db);
    if (!target) throw new Error("Expected the existing Demo Club owned by the public demo student. Refusing to create or reset it.");

    const existing = await db.select({ user: users, resume: resumes, status: bookMembers.status })
      .from(users)
      .leftJoin(resumes, eq(resumes.userId, users.id))
      .leftJoin(bookMembers, and(eq(bookMembers.resumeId, resumes.id), eq(bookMembers.bookId, target.bookId)))
      .where(inArray(users.id, VOLUNTEER_STUDENTS.map((student) => student.userId)));

    // A repeat run is a no-op only for complete, unchanged samples. Partial or edited rows
    // need human review; never overwrite a profile or silently reinstate a removed membership.
    for (const row of existing) {
      const student = VOLUNTEER_STUDENTS.find((candidate) => candidate.userId === row.user.id)!;
      if (row.user.email !== student.email || row.user.schoolDomain !== "psu.edu" || row.user.accountType !== "school"
        || !row.resume || row.resume.contactName !== student.name || !hasGeneratedFakeKeys(row.resume)
        || !isDeepStrictEqual(row.resume.profile, student.profile) || row.status !== "accepted") {
        throw new Error(`Existing sample ${student.userId} is incomplete or changed. Nothing will be overwritten.`);
      }
    }

    const missing = VOLUNTEER_STUDENTS.filter((student) => !existing.some((row) => row.user.id === student.userId));
    console.log(`${missing.length} volunteer samples to add; ${existing.length} already present. Existing records will not change.`);
    if (!process.argv.includes("--apply") || !missing.length) return;

    const staged: { student: (typeof VOLUNTEER_STUDENTS)[number]; id: string; pdfKey: string; previewKeys: string[] }[] = [];
    try {
      for (const student of missing) {
        staged.push({ student, id: randomUUID(), ...await storeFakeResumeFiles(student) });
      }

      await db.transaction(async (tx) => {
        const [locked] = await demoBook(tx).for("share");
        if (locked?.bookId !== target.bookId) throw new Error("Demo Club changed during generation; refusing to attach the samples.");
        const now = new Date();
        await tx.insert(users).values(staged.map(({ student }) => ({
          id: student.userId, email: student.email, accountType: "school" as const,
          schoolDomain: "psu.edu", onboardedAt: now,
        })));
        await tx.insert(resumes).values(staged.map(({ student, id, pdfKey, previewKeys }) => ({
          id, userId: student.userId, contactName: student.name, pdfKey, previewKeys,
          ...resumeColumns(student.profile, student.school),
        })));
        await tx.insert(bookMembers).values(staged.map(({ id }) => ({
          bookId: target.bookId, resumeId: id, status: "accepted" as const,
          consentedAt: now, requestedAt: now, decidedAt: now,
        })));
      });
    } catch (error) {
      // A lost COMMIT response is ambiguous: delete only uploads proven unreferenced.
      // If the database cannot answer, retain them rather than break a committed resume.
      try {
        if (staged.length) {
          const attached = await db.select({ pdfKey: resumes.pdfKey }).from(resumes)
            .where(inArray(resumes.pdfKey, staged.map((row) => row.pdfKey)));
          const unused = staged.filter((row) => !attached.some((resume) => resume.pdfKey === row.pdfKey));
          await deleteFiles(unused.flatMap((row) => [row.pdfKey, ...row.previewKeys]));
        }
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Could not safely clean up staged demo files; inspect before deleting anything.");
      }
      throw error;
    }

    console.log(`Added ${staged.length} fictional volunteers with source PDFs and redacted previews to Demo Club.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
