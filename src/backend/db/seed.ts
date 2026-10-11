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
import type { ResumeProfile, Seeking } from "@/backend/parsing/types";
import { resumeColumns } from "@/backend/resumes/columns";
import { findSchool } from "@/backend/schools";

import { createDatabase } from "./client";
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

const SKILLS_BY_MAJOR: Record<string, string[]> = {
  "Computer Science": ["Python", "TypeScript", "React", "Java", "C++", "Go", "PostgreSQL", "AWS", "Docker", "Kubernetes", "Next.js", "GraphQL", "Rust", "Git"],
  "Computer Engineering": ["C", "C++", "Verilog", "FPGA", "Embedded C", "Python", "RTOS", "PCB Design", "ARM", "Linux"],
  "Electrical Engineering": ["MATLAB", "Simulink", "Altium", "LTspice", "Power Systems", "Signal Processing", "Python", "PCB Design"],
  "Mechanical Engineering": ["SolidWorks", "ANSYS", "MATLAB", "GD&T", "CNC Machining", "Fusion 360", "FEA", "3D Printing", "Python"],
  "Industrial Engineering": ["Lean Six Sigma", "Simio", "Tableau", "SQL", "Excel", "Python", "Process Mapping", "Minitab"],
  "Chemical Engineering": ["Aspen Plus", "MATLAB", "HYSYS", "Process Safety", "Python", "Excel"],
  "Aerospace Engineering": ["MATLAB", "CATIA", "ANSYS Fluent", "Python", "Orbital Mechanics", "SolidWorks", "CFD"],
  "Data Sciences": ["Python", "PyTorch", "SQL", "Pandas", "Spark", "Tableau", "scikit-learn", "R", "Airflow"],
  Statistics: ["R", "Python", "SAS", "SQL", "Bayesian Modeling", "Tableau", "Excel"],
  "Information Sciences & Technology": ["SQL", "Python", "Figma", "JavaScript", "Tableau", "Agile", "Jira", "Power BI"],
  Cybersecurity: ["Wireshark", "Python", "Linux", "Burp Suite", "Splunk", "Network Security", "Bash", "Nmap"],
  Mathematics: ["Python", "MATLAB", "LaTeX", "R", "Optimization", "Probability", "C++"],
  "Actuarial Science": ["Excel", "VBA", "R", "SQL", "SAS", "Exam P", "Exam FM", "Python"],
  Finance: ["Excel", "Financial Modeling", "Bloomberg", "Python", "SQL", "Valuation", "PowerPoint"],
  Marketing: ["Figma", "HubSpot", "Google Analytics", "SEO", "Copywriting", "Canva", "SQL"],
  "Supply Chain": ["SAP", "Excel", "SQL", "Tableau", "Forecasting", "Lean", "Power BI"],
};

const ROLES_BY_MAJOR: Record<string, string[]> = {
  "Computer Science": ["Software Engineering Intern", "Backend Developer Intern", "Full-Stack Developer", "Undergraduate Researcher", "Teaching Assistant"],
  "Computer Engineering": ["Embedded Systems Intern", "Hardware Engineering Intern", "Firmware Intern", "Undergraduate Researcher"],
  "Electrical Engineering": ["Electrical Engineering Intern", "Power Systems Intern", "Test Engineering Co-op", "Lab Assistant"],
  "Mechanical Engineering": ["Mechanical Design Intern", "Manufacturing Engineering Co-op", "Product Development Intern"],
  "Industrial Engineering": ["Operations Intern", "Process Improvement Co-op", "Supply Chain Analyst Intern"],
  "Chemical Engineering": ["Process Engineering Intern", "R&D Intern", "Quality Engineering Co-op"],
  "Aerospace Engineering": ["Propulsion Intern", "Structures Intern", "Flight Test Co-op"],
  "Data Sciences": ["Data Science Intern", "Machine Learning Intern", "Analytics Intern", "Research Assistant"],
  Statistics: ["Data Analyst Intern", "Biostatistics Intern", "Research Assistant"],
  "Information Sciences & Technology": ["IT Consulting Intern", "Product Analyst Intern", "UX Research Intern"],
  Cybersecurity: ["Security Analyst Intern", "SOC Intern", "Penetration Testing Intern"],
  Mathematics: ["Quantitative Research Intern", "Math Tutor", "Research Assistant"],
  "Actuarial Science": ["Actuarial Intern", "Pricing Analyst Intern", "Risk Analyst Intern"],
  Finance: ["Investment Banking Summer Analyst", "Equity Research Intern", "Corporate Finance Intern"],
  Marketing: ["Marketing Intern", "Brand Strategy Intern", "Growth Intern"],
  "Supply Chain": ["Supply Chain Intern", "Procurement Intern", "Logistics Analyst Intern"],
};

const ORGS = [
  "Vanguard", "Lockheed Martin", "Boeing", "PNC", "Comcast", "SAP", "Johnson & Johnson", "Penn State ARL",
  "Deloitte", "EY", "Prudential", "Capital One", "Amazon", "Microsoft", "Google", "Bloomberg", "Merck",
  "Siemens", "Northrop Grumman", "Lutron", "Erie Insurance", "Highmark Health", "IBM", "Accenture",
  "Hershey", "AccuWeather", "Raytheon", "Johns Hopkins APL", "Leidos", "NVIDIA", "Qualcomm", "Intel",
];

const FIRST_NAMES = [
  "Priya", "Marcus", "Elena", "Jordan", "Aisha", "Tyler", "Mei", "Diego", "Hannah", "Samuel", "Nadia", "Ethan",
  "Grace", "Omar", "Lucy", "Kenji", "Sofia", "Andre", "Maya", "Liam", "Fatima", "Noah", "Isabel", "Caleb",
];

const LAST_NAMES = [
  "Raman", "Okafor", "Kowalski", "Nguyen", "Brennan", "Haddad", "Castillo", "Weiss", "Tanaka", "Murphy",
  "Abiodun", "Schultz", "Patel", "Romero", "Fischer", "Osei", "Lindqvist", "Moreau", "Chen", "Delgado",
];

/** Small deterministic PRNG (mulberry32). */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seeded(20261011);
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

function pickMany<T>(items: readonly T[], howMany: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < howMany && pool.length > 0) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return picked;
}

function makeProfile(club: ClubSeed): ResumeProfile {
  const primaryMajor = pick(club.majors);
  const majors = random() < 0.18 ? [primaryMajor, pick(club.majors.filter((major) => major !== primaryMajor))] : [primaryMajor];
  const gradYear = pick([2026, 2027, 2027, 2028, 2028, 2029]);

  // Juniors and younger want internships; seniors mostly want full-time.
  const seeking: Seeking[] =
    gradYear >= 2028 ? ["internship"]
    : gradYear === 2027 ? (random() < 0.3 ? ["internship", "full-time"] : ["internship"])
    : random() < 0.75 ? ["full-time"] : ["internship", "full-time"];

  return {
    gradYear,
    majors,
    degree: random() < 0.85 ? "BS" : random() < 0.75 ? "MS" : "PhD",
    seeking,
    skills: pickMany([...new Set(majors.flatMap((major) => SKILLS_BY_MAJOR[major]))], between(4, 12)),
    experience: pickMany(ORGS, between(1, 3)).map((org) => ({ title: pick(ROLES_BY_MAJOR[primaryMajor]), org })),
  };
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

async function removeSeedData(db: ReturnType<typeof createDatabase>["db"]) {
  const seedUsers = like(users.id, `${SEED_PREFIX}%`);
  const seedClubIds = db.select({ id: clubs.id }).from(clubs).where(like(clubs.ownerId, `${SEED_PREFIX}%`));
  const seedBookIds = db.select({ id: books.id }).from(books).where(inArray(books.clubId, seedClubIds));

  // Purchases block deleting their book, so they go first. Clubs cascade to books and
  // memberships; users cascade to resumes.
  await db.delete(unlocks).where(or(inArray(unlocks.bookId, seedBookIds), like(unlocks.recruiterId, `${SEED_PREFIX}%`)));
  await db.delete(clubs).where(like(clubs.ownerId, `${SEED_PREFIX}%`));
  await db.delete(users).where(seedUsers);
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

  function addStudent(club: ClubSeed, status: "accepted" | "pending", requestedAt: Date) {
    const userId = nextUserId();
    const resumeId = randomUUID();
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

    userRows.push({ id: userId, email: `${name.toLowerCase().replace(" ", ".")}${userNumber}@${club.schoolDomain}`, accountType: "school", schoolDomain: club.schoolDomain, onboardedAt: requestedAt });
    resumeRows.push({ id: resumeId, userId, contactName: name, pdfKey: `seed/${resumeId}.pdf`, createdAt: requestedAt, updatedAt: requestedAt, ...resumeColumns(makeProfile(club), findSchool(club.schoolDomain)!.name) });

    const decidedAt = status === "accepted" ? new Date(requestedAt.getTime() + 3_600_000) : null;
    memberRows.push({ bookId: bookIdByClub.get(club.key)!, resumeId, status, consentedAt: requestedAt, requestedAt, decidedAt });

    // About a quarter of members are also in another club's book at the same school.
    const sameSchool = CLUBS.filter((other) => other.schoolDomain === club.schoolDomain && other.key !== club.key);
    if (status === "accepted" && sameSchool.length > 0 && random() < 0.25) {
      memberRows.push({ bookId: bookIdByClub.get(pick(sameSchool).key)!, resumeId, status, consentedAt: requestedAt, requestedAt, decidedAt });
    }
  }

  let hours = 2;
  for (const club of CLUBS) {
    for (let i = 0; i < club.members; i++) addStudent(club, "accepted", hoursAgo((hours += between(1, 4))));
    for (let i = 0; i < PENDING_PER_CLUB; i++) addStudent(club, "pending", hoursAgo(i * 0.4 + 0.2));
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
