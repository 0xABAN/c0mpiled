/**
 * Creates the shared demo accounts and restores their data, undoing whatever visitors did.
 *
 *   npm run demo:reset              recreate the demo accounts' data
 *   npm run demo:reset -- --remove  delete it (the Cognito users stay, with no Roster account)
 *
 * The two logins (see `./accounts`) are real Cognito users with the public demo password. Everyone
 * else here is invented, with ids starting "demo:", separate from the "seed:" data:
 *
 * - Demo Club, run by the demo officer: accepted members, pending requests, and two sales.
 * - Demo Robotics, run by an invented officer.
 * - The demo student: a real PDF with redacted previews, accepted into Demo Club and pending at
 *   Demo Robotics.
 */

import { randomUUID } from "node:crypto";

import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";
import { inArray, like, or } from "drizzle-orm";

import { createDatabase, type Database } from "@/backend/db/client";
import { makeTextPdf } from "@/backend/db/fake/pdf";
import { fakePeople } from "@/backend/db/fake/people";
import { bookMembers, books, clubs, resumes, unlocks, users } from "@/backend/db/schema";
import { redactResume } from "@/backend/redaction";
import { resumeColumns } from "@/backend/resumes/columns";
import { deleteFiles, putPreviewPages, putResumePdf, resumePdfKey } from "@/backend/storage";

import { DEMO_ACCOUNTS, demoPassword, type DemoRole } from "./accounts";

const DEMO_PREFIX = "demo:";
const SCHOOL_DOMAIN = "psu.edu";
const SCHOOL_NAME = "Pennsylvania State University";

const DEMO_CLUB_MAJORS = ["Computer Science", "Data Sciences", "Information Sciences & Technology", "Mathematics"];
const ROBOTICS_MAJORS = ["Mechanical Engineering", "Electrical Engineering", "Computer Engineering"];

/** The demo student's resume. The name, email, phone, and link are what redaction must hide. */
const STUDENT = {
  name: "Riley Morgan",
  lines: [
    "Riley Morgan",
    `${DEMO_ACCOUNTS.student} | (814) 555-0142 | linkedin.com/in/riley-morgan-demo`,
    "B.S. Computer Science, Penn State, Class of 2027",
    "",
    "Experience",
    "Software Engineering Intern, Vanguard (Summer 2026)",
    "Undergraduate Researcher, Penn State ARL",
    "",
    "Skills: Python, TypeScript, React, PostgreSQL, AWS, Docker",
  ],
  profile: {
    gradYear: 2027,
    majors: ["Computer Science"],
    degree: "BS" as const,
    seeking: ["internship" as const],
    skills: ["Python", "TypeScript", "React", "PostgreSQL", "AWS", "Docker"],
    experience: [
      { title: "Software Engineering Intern", org: "Vanguard" },
      { title: "Undergraduate Researcher", org: "Penn State ARL" },
    ],
  },
};

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Run this through \`npm run demo:reset\`.`);
  return value;
}

/** Makes sure the demo login exists, is verified, and has the demo password. Returns its `sub`. */
async function ensureCognitoUser(cognito: CognitoIdentityProviderClient, userPoolId: string, email: string): Promise<string> {
  const subOf = (attributes: { Name?: string; Value?: string }[] | undefined) => {
    const sub = attributes?.find((attribute) => attribute.Name === "sub")?.Value;
    if (!sub) throw new Error(`Cognito user ${email} has no sub.`);
    return sub;
  };

  let sub: string;
  try {
    sub = subOf((await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }))).UserAttributes);
  } catch (error) {
    if (!(error instanceof UserNotFoundException)) throw error;

    const created = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        MessageAction: "SUPPRESS",
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
      }),
    );
    sub = subOf(created.User?.Attributes);
  }

  // Visitors could have changed it; the demo only works with the published password.
  await cognito.send(
    new AdminSetUserPasswordCommand({ UserPoolId: userPoolId, Username: email, Password: demoPassword(), Permanent: true }),
  );

  return sub;
}

/** Deletes every demo row and the demo student's S3 files. */
async function removeDemoData(db: Database, loginIds: string[]) {
  const isDemoUser = or(like(users.id, `${DEMO_PREFIX}%`), inArray(users.id, loginIds))!;
  const demoClubIds = db.select({ id: clubs.id }).from(clubs).where(or(like(clubs.ownerId, `${DEMO_PREFIX}%`), inArray(clubs.ownerId, loginIds)));
  const demoBookIds = db.select({ id: books.id }).from(books).where(inArray(books.clubId, demoClubIds));

  const files = await db
    .select({ pdfKey: resumes.pdfKey, previewKeys: resumes.previewKeys })
    .from(resumes)
    .where(inArray(resumes.userId, loginIds));

  // Purchases block deleting their book, so they go first. Clubs cascade to books and
  // memberships; users cascade to resumes.
  await db.delete(unlocks).where(or(inArray(unlocks.bookId, demoBookIds), like(unlocks.recruiterId, `${DEMO_PREFIX}%`), inArray(unlocks.recruiterId, loginIds)));
  await db.delete(clubs).where(or(like(clubs.ownerId, `${DEMO_PREFIX}%`), inArray(clubs.ownerId, loginIds)));
  await db.delete(users).where(isDemoUser);

  await deleteFiles(files.flatMap((file) => [file.pdfKey, ...file.previewKeys]));
}

async function insertDemoData(db: Database, logins: Record<DemoRole, string>) {
  const people = fakePeople(20261012);
  const onboardedAt = hoursAgo(48);

  const userRows: (typeof users.$inferInsert)[] = [
    { id: logins.officer, email: DEMO_ACCOUNTS.officer, accountType: "school", schoolDomain: SCHOOL_DOMAIN, onboardedAt },
    { id: logins.student, email: DEMO_ACCOUNTS.student, accountType: "school", schoolDomain: SCHOOL_DOMAIN, onboardedAt },
    { id: `${DEMO_PREFIX}robotics-officer`, email: "robotics.officer.demo@psu.edu", accountType: "school", schoolDomain: SCHOOL_DOMAIN, onboardedAt },
  ];

  const demoClub = { id: randomUUID(), bookId: randomUUID(), priceCents: 30000 };
  const robotics = { id: randomUUID(), bookId: randomUUID(), priceCents: 25000 };

  const clubRows: (typeof clubs.$inferInsert)[] = [
    { id: demoClub.id, slug: "psu-demo-club", schoolDomain: SCHOOL_DOMAIN, name: "Demo Club", tagline: "A sample club for trying Roster as an officer", hue: "green", payoutEmail: DEMO_ACCOUNTS.officer, ownerId: logins.officer },
    { id: robotics.id, slug: "psu-demo-robotics", schoolDomain: SCHOOL_DOMAIN, name: "Demo Robotics", tagline: "A second sample club", hue: "orange", payoutEmail: "robotics.officer.demo@psu.edu", ownerId: `${DEMO_PREFIX}robotics-officer` },
  ];
  const bookRows: (typeof books.$inferInsert)[] = [
    { id: demoClub.bookId, clubId: demoClub.id, title: "Fall 2026", priceCents: demoClub.priceCents },
    { id: robotics.bookId, clubId: robotics.id, title: "Fall 2026", priceCents: robotics.priceCents },
  ];

  const resumeRows: (typeof resumes.$inferInsert)[] = [];
  const memberRows: (typeof bookMembers.$inferInsert)[] = [];

  /** Invented members (no PDF, so no previews), like the seed's students. */
  function addInventedStudent(n: number, bookId: string, majors: string[], status: "accepted" | "pending", requestedAt: Date) {
    const userId = `${DEMO_PREFIX}student-${n}`;
    const resumeId = randomUUID();
    const name = people.name();

    userRows.push({ id: userId, email: `${name.toLowerCase().replace(" ", ".")}.demo${n}@psu.edu`, accountType: "school", schoolDomain: SCHOOL_DOMAIN, onboardedAt: requestedAt });
    resumeRows.push({ id: resumeId, userId, contactName: name, pdfKey: `demo/${resumeId}.pdf`, createdAt: requestedAt, updatedAt: requestedAt, ...resumeColumns(people.profile(majors), SCHOOL_NAME) });
    memberRows.push({ bookId, resumeId, status, consentedAt: requestedAt, requestedAt, decidedAt: status === "accepted" ? new Date(requestedAt.getTime() + 3_600_000) : null });
  }

  let n = 0;
  for (let i = 0; i < 6; i++) addInventedStudent(++n, demoClub.bookId, DEMO_CLUB_MAJORS, "accepted", hoursAgo(30 - i * 4));
  for (let i = 0; i < 3; i++) addInventedStudent(++n, demoClub.bookId, DEMO_CLUB_MAJORS, "pending", hoursAgo(2 - i * 0.5));
  for (let i = 0; i < 5; i++) addInventedStudent(++n, robotics.bookId, ROBOTICS_MAJORS, "accepted", hoursAgo(26 - i * 3));

  // The demo student has a real PDF, so their previews and downloads work like a real member's.
  const pdf = makeTextPdf(STUDENT.lines);
  const pdfKey = resumePdfKey(logins.student, randomUUID());
  await putResumePdf(pdfKey, pdf);
  const previewKeys = await putPreviewPages(logins.student, await redactResume(pdf, { name: STUDENT.name }));

  const studentResumeId = randomUUID();
  const studentJoinedAt = hoursAgo(20);
  resumeRows.push({ id: studentResumeId, userId: logins.student, contactName: STUDENT.name, pdfKey, previewKeys, createdAt: studentJoinedAt, updatedAt: studentJoinedAt, ...resumeColumns(STUDENT.profile, SCHOOL_NAME) });
  memberRows.push(
    { bookId: demoClub.bookId, resumeId: studentResumeId, status: "accepted", consentedAt: studentJoinedAt, requestedAt: studentJoinedAt, decidedAt: hoursAgo(19) },
    { bookId: robotics.bookId, resumeId: studentResumeId, status: "pending", consentedAt: hoursAgo(1), requestedAt: hoursAgo(1), decidedAt: null },
  );

  // Two companies already bought Demo Club's book, so the officer sees earnings.
  const unlockRows: (typeof unlocks.$inferInsert)[] = ["Lutron", "Vanguard"].map((company, index) => {
    const recruiterId = `${DEMO_PREFIX}recruiter-${index + 1}`;
    userRows.push({ id: recruiterId, email: `recruiter${index + 1}@${company.toLowerCase()}.example.com`, accountType: "recruiter", company, onboardedAt });
    return { bookId: demoClub.bookId, recruiterId, priceCents: demoClub.priceCents, createdAt: hoursAgo(5 - index * 3) };
  });

  await db.transaction(async (tx) => {
    await tx.insert(users).values(userRows);
    await tx.insert(clubs).values(clubRows);
    await tx.insert(books).values(bookRows);
    await tx.insert(resumes).values(resumeRows);
    await tx.insert(bookMembers).values(memberRows);
    await tx.insert(unlocks).values(unlockRows);
  });

  return { resumes: resumeRows.length, memberships: memberRows.length, purchases: unlockRows.length };
}

async function main() {
  const userPoolId = requireEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID");
  const cognito = new CognitoIdentityProviderClient({ region: requireEnv("APP_REGION") });
  const { db, pool } = createDatabase(requireEnv("DATABASE_URL"));

  try {
    const logins = {
      officer: await ensureCognitoUser(cognito, userPoolId, DEMO_ACCOUNTS.officer),
      student: await ensureCognitoUser(cognito, userPoolId, DEMO_ACCOUNTS.student),
    };

    await removeDemoData(db, Object.values(logins));
    if (process.argv.includes("--remove")) {
      console.log("Removed demo data.");
      return;
    }

    const counts = await insertDemoData(db, logins);
    console.log(`Demo ready: ${counts.resumes} resumes, ${counts.memberships} memberships, ${counts.purchases} purchases.`);
    console.log(`Log in as ${DEMO_ACCOUNTS.officer} or ${DEMO_ACCOUNTS.student} with NEXT_PUBLIC_DEMO_PASSWORD.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
