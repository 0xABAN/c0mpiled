/**
 * Fills the database with invented clubs, students, and purchases for demos and development.
 *
 *   npm run db:seed              replace all seed data
 *   npm run db:seed -- --remove  delete it (do this before real launch)
 *
 * Every seed account's id starts with "seed:", so seed data can always be found and removed
 * without touching real accounts. Everyone here is made up. A fixed PRNG seed makes every run
 * produce the same people.
 */

import { randomUUID } from "node:crypto";

import { inArray, like, or } from "drizzle-orm";

import type { Hue } from "@/backend/api/types";
import { resumeColumns } from "@/backend/resumes/columns";
import { findSchool } from "@/backend/schools";
import { deleteFiles } from "@/backend/storage";

import { createDatabase } from "./client";
import { fakePeople } from "./fake/people";
import { storeFakeResumeFiles } from "./fake/resume-files";
import { bookMembers, books, clubs, resumes, unlocks, users } from "./schema";

const SEED_PREFIX = "seed:";

type ClubSeed = {
  key: string;
  schoolDomain: string;
  name: string;
  tagline: string;
  hue: Hue;
  priceCents: number;
  majors: string[];
  members: number;
};

const CLUBS: ClubSeed[] = [
  { key: "hkn", schoolDomain: "psu.edu", name: "HKN", tagline: "Electrical & computer engineering honor society", hue: "purple", priceCents: 30000, majors: ["Computer Engineering", "Electrical Engineering", "Computer Science"], members: 14 },
  { key: "swe", schoolDomain: "psu.edu", name: "Society of Women Engineers", tagline: "Penn State's largest engineering org", hue: "pink", priceCents: 45000, majors: ["Mechanical Engineering", "Industrial Engineering", "Chemical Engineering", "Aerospace Engineering", "Computer Science"], members: 12 },
  { key: "nai", schoolDomain: "psu.edu", name: "Nittany AI Society", tagline: "Students building with machine learning", hue: "teal", priceCents: 25000, majors: ["Computer Science", "Data Sciences", "Statistics", "Information Sciences & Technology"], members: 10 },
  { key: "hackpsu", schoolDomain: "psu.edu", name: "HackPSU", tagline: "Penn State's student-run hackathon", hue: "orange", priceCents: 20000, majors: ["Computer Science", "Cybersecurity", "Information Sciences & Technology", "Mathematics"], members: 9 },
  { key: "actsci", schoolDomain: "psu.edu", name: "Actuarial Science Club", tagline: "Future actuaries and risk analysts", hue: "blue", priceCents: 65000, majors: ["Actuarial Science", "Statistics", "Mathematics", "Finance"], members: 8 },
  { key: "bc", schoolDomain: "psu.edu", name: "Builder's Collective", tagline: "Founders, hackers, and operators", hue: "green", priceCents: 25000, majors: ["Finance", "Marketing", "Computer Science", "Supply Chain", "Mechanical Engineering"], members: 9 },
  { key: "csc", schoolDomain: "pitt.edu", name: "Computer Science Club", tagline: "Pitt's home for programmers", hue: "yellow", priceCents: 30000, majors: ["Computer Science", "Data Sciences", "Mathematics"], members: 8 },
  { key: "scottylabs", schoolDomain: "cmu.edu", name: "ScottyLabs", tagline: "Building tech for the CMU community", hue: "red", priceCents: 50000, majors: ["Computer Science", "Electrical Engineering", "Information Sciences & Technology"], members: 8 },
];

/** Companies that already bought a book, for dashboard history. */
const PURCHASES: { company: string; club: string; hoursAgo: number }[] = [
  { company: "Lutron", club: "hkn", hoursAgo: 1 },
  { company: "AccuWeather", club: "hkn", hoursAgo: 3 },
  { company: "Boeing", club: "swe", hoursAgo: 2 },
];

const PENDING_PER_CLUB = 3;

const people = fakePeople(20261011);
const { random, pick, between } = people;

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

async function removeSeedData(db: ReturnType<typeof createDatabase>["db"]) {
  const seedUsers = like(users.id, `${SEED_PREFIX}%`);
  const seedClubIds = db.select({ id: clubs.id }).from(clubs).where(like(clubs.ownerId, `${SEED_PREFIX}%`));
  const seedBookIds = db.select({ id: books.id }).from(books).where(inArray(books.clubId, seedClubIds));

  const files = await db
    .select({ pdfKey: resumes.pdfKey, previewKeys: resumes.previewKeys })
    .from(resumes)
    .where(like(resumes.userId, `${SEED_PREFIX}%`));

  // Purchases block deleting their book, so they go first. Clubs cascade to books and
  // memberships; users cascade to resumes.
  await db.delete(unlocks).where(or(inArray(unlocks.bookId, seedBookIds), like(unlocks.recruiterId, `${SEED_PREFIX}%`)));
  await db.delete(clubs).where(like(clubs.ownerId, `${SEED_PREFIX}%`));
  await db.delete(users).where(seedUsers);
  await deleteFiles(files.flatMap((file) => [file.pdfKey, ...file.previewKeys]));
}

async function insertSeedData(db: ReturnType<typeof createDatabase>["db"]) {
  let userNumber = 0;
  const nextUserId = () => `${SEED_PREFIX}${++userNumber}`;

  const userRows: (typeof users.$inferInsert)[] = [];
  const clubRows: (typeof clubs.$inferInsert)[] = [];
  const bookRows: (typeof books.$inferInsert)[] = [];
  const resumeRows: (typeof resumes.$inferInsert)[] = [];
  const memberRows: (typeof bookMembers.$inferInsert)[] = [];
  const unlockRows: (typeof unlocks.$inferInsert)[] = [];

  const bookIdByClub = new Map<string, string>();

  for (const club of CLUBS) {
    const ownerId = nextUserId();
    const clubId = randomUUID();
    const bookId = randomUUID();
    const stem = club.schoolDomain.replace(/\.edu$/, "");

    userRows.push({ id: ownerId, email: `${club.key}.officer@${club.schoolDomain}`, accountType: "school", schoolDomain: club.schoolDomain, onboardedAt: hoursAgo(72) });
    clubRows.push({ id: clubId, slug: `${stem}-${club.key}`, schoolDomain: club.schoolDomain, name: club.name, tagline: club.tagline, hue: club.hue, payoutEmail: `${club.key}.treasurer@${club.schoolDomain}`, ownerId });
    bookRows.push({ id: bookId, clubId, title: "Fall 2026", priceCents: club.priceCents });
    bookIdByClub.set(club.key, bookId);
  }

  async function addStudent(club: ClubSeed, status: "accepted" | "pending", requestedAt: Date) {
    const userId = nextUserId();
    const resumeId = randomUUID();
    const name = people.name();
    const email = `${name.toLowerCase().replace(" ", ".")}${userNumber}@${club.schoolDomain}`;
    const profile = people.profile(club.majors);
    const school = findSchool(club.schoolDomain)!.name;
    const files = await storeFakeResumeFiles({ userId, name, email, school, profile });

    userRows.push({ id: userId, email, accountType: "school", schoolDomain: club.schoolDomain, onboardedAt: requestedAt });
    resumeRows.push({ id: resumeId, userId, contactName: name, ...files, createdAt: requestedAt, updatedAt: requestedAt, ...resumeColumns(profile, school) });

    const decidedAt = status === "accepted" ? new Date(requestedAt.getTime() + 3_600_000) : null;
    memberRows.push({ bookId: bookIdByClub.get(club.key)!, resumeId, status, consentedAt: requestedAt, requestedAt, decidedAt });

    // About a quarter of members are also in another club's book at the same school.
    const sameSchool = CLUBS.filter((other) => other.schoolDomain === club.schoolDomain && other.key !== club.key);
    if (status === "accepted" && sameSchool.length > 0 && random() < 0.25) {
      memberRows.push({ bookId: bookIdByClub.get(pick(sameSchool).key)!, resumeId, status, consentedAt: requestedAt, requestedAt, decidedAt });
    }
  }

  let hours = 2;
  try {
    for (const club of CLUBS) {
      for (let i = 0; i < club.members; i++) await addStudent(club, "accepted", hoursAgo((hours += between(1, 4))));
      for (let i = 0; i < PENDING_PER_CLUB; i++) await addStudent(club, "pending", hoursAgo(i * 0.4 + 0.2));
    }
  } catch (error) {
    // No rows have been inserted yet, so failed generation can safely discard its files.
    await deleteFiles(resumeRows.flatMap((resume) => [resume.pdfKey, ...(resume.previewKeys ?? [])]));
    throw error;
  }

  for (const purchase of PURCHASES) {
    const recruiterId = nextUserId();
    const club = CLUBS.find((candidate) => candidate.key === purchase.club)!;

    userRows.push({ id: recruiterId, email: `recruiter${userNumber}@${purchase.company.toLowerCase()}.example.com`, accountType: "recruiter", company: purchase.company, onboardedAt: hoursAgo(48) });
    unlockRows.push({ bookId: bookIdByClub.get(club.key)!, recruiterId, priceCents: club.priceCents, createdAt: hoursAgo(purchase.hoursAgo) });
  }

  await db.transaction(async (tx) => {
    await tx.insert(users).values(userRows);
    await tx.insert(clubs).values(clubRows);
    await tx.insert(books).values(bookRows);
    await tx.insert(resumes).values(resumeRows);
    await tx.insert(bookMembers).values(memberRows);
    await tx.insert(unlocks).values(unlockRows);
  });

  return { clubs: clubRows.length, resumes: resumeRows.length, memberships: memberRows.length, purchases: unlockRows.length };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Run this through `npm run db:seed`.");

  const { db, pool } = createDatabase(url);

  try {
    await removeSeedData(db);
    if (process.argv.includes("--remove")) {
      console.log("Removed seed data.");
      return;
    }

    const counts = await insertSeedData(db);
    console.log(`Seeded ${counts.clubs} clubs, ${counts.resumes} resumes, ${counts.memberships} memberships, ${counts.purchases} purchases.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
