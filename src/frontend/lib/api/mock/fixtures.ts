/**
 * Fake clubs and resumes for building the UI before the backend lands.
 * Every person here is invented. Generation is seeded, so the data is identical on every run.
 */

import type { BookSummary, ClubSummary, Degree, ResumeView, School, Seeking } from "../types";

/** A slice of the US university list the real `searchSchools` covers. */
export const SCHOOLS: School[] = [
  { name: "Penn State", domains: ["psu.edu"] },
  { name: "University of Pittsburgh", domains: ["pitt.edu"] },
  { name: "Carnegie Mellon University", domains: ["cmu.edu", "andrew.cmu.edu"] },
  { name: "University of Pennsylvania", domains: ["upenn.edu", "seas.upenn.edu", "wharton.upenn.edu"] },
  { name: "Temple University", domains: ["temple.edu"] },
  { name: "Drexel University", domains: ["drexel.edu"] },
  { name: "Rutgers University", domains: ["rutgers.edu", "scarletmail.rutgers.edu"] },
  { name: "Purdue University", domains: ["purdue.edu"] },
  { name: "University of Texas at Austin", domains: ["utexas.edu"] },
  { name: "University of Michigan", domains: ["umich.edu"] },
  { name: "Ohio State University", domains: ["osu.edu"] },
  { name: "University of Maryland", domains: ["umd.edu", "terpmail.umd.edu"] },
  { name: "Georgia Institute of Technology", domains: ["gatech.edu"] },
  { name: "Virginia Tech", domains: ["vt.edu"] },
  { name: "Lehigh University", domains: ["lehigh.edu"] },
  { name: "Villanova University", domains: ["villanova.edu"] },
];

/** `priceCents` is what the club charges for its whole book. */
type ClubSeed = ClubSummary & { majors: string[]; size: number; priceCents: number };

const SCHOOL = "Penn State";
const SCHOOL_DOMAIN = "psu.edu";

const CLUB_SEEDS: ClubSeed[] = [
  {
    id: "club_hkn",
    slug: "psu-hkn",
    priceCents: 30000,
    name: "Penn State HKN",
    tagline: "Electrical & computer engineering honor society",
    school: SCHOOL,
    hue: "purple",
    majors: ["Computer Engineering", "Electrical Engineering", "Computer Science"],
    size: 14,
  },
  {
    id: "club_swe",
    slug: "psu-swe",
    priceCents: 45000,
    name: "Society of Women Engineers",
    tagline: "Penn State's largest engineering org",
    school: SCHOOL,
    hue: "pink",
    majors: ["Mechanical Engineering", "Industrial Engineering", "Chemical Engineering", "Aerospace Engineering", "Computer Science"],
    size: 12,
  },
  {
    id: "club_nai",
    slug: "psu-nittany-ai",
    priceCents: 25000,
    name: "Nittany AI Society",
    tagline: "Students building with machine learning",
    school: SCHOOL,
    hue: "teal",
    majors: ["Computer Science", "Data Sciences", "Statistics", "Information Sciences & Technology"],
    size: 10,
  },
  {
    id: "club_hackpsu",
    slug: "psu-hackpsu",
    priceCents: 20000,
    name: "HackPSU",
    tagline: "Penn State's student-run hackathon",
    school: SCHOOL,
    hue: "orange",
    majors: ["Computer Science", "Cybersecurity", "Information Sciences & Technology", "Mathematics"],
    size: 9,
  },
  {
    id: "club_actsci",
    slug: "psu-actuarial-science",
    priceCents: 65000,
    name: "Actuarial Science Club",
    tagline: "Future actuaries and risk analysts",
    school: SCHOOL,
    hue: "blue",
    majors: ["Actuarial Science", "Statistics", "Mathematics", "Finance"],
    size: 8,
  },
  {
    id: "club_bc",
    slug: "psu-builders-collective",
    priceCents: 25000,
    name: "Builder's Collective",
    tagline: "Founders, hackers, and operators",
    school: SCHOOL,
    hue: "green",
    majors: ["Finance", "Marketing", "Computer Science", "Supply Chain", "Mechanical Engineering"],
    size: 9,
  },
];

const SKILLS_BY_MAJOR: Record<string, string[]> = {
  "Computer Science": ["Python", "TypeScript", "React", "Java", "C++", "Go", "PostgreSQL", "AWS", "Docker", "Kubernetes", "Next.js", "GraphQL", "Rust", "Git"],
  "Computer Engineering": ["C", "C++", "Verilog", "FPGA", "Embedded C", "Python", "RTOS", "PCB Design", "ARM", "Linux"],
  "Electrical Engineering": ["MATLAB", "Simulink", "Altium", "LTspice", "Power Systems", "Signal Processing", "Python", "Oscilloscopes", "PCB Design"],
  "Mechanical Engineering": ["SolidWorks", "ANSYS", "MATLAB", "GD&T", "CNC Machining", "Fusion 360", "FEA", "3D Printing", "Python"],
  "Industrial Engineering": ["Lean Six Sigma", "Simio", "Tableau", "SQL", "Excel", "Python", "Process Mapping", "Minitab"],
  "Chemical Engineering": ["Aspen Plus", "MATLAB", "HYSYS", "Process Safety", "Python", "Excel", "Lab Techniques"],
  "Aerospace Engineering": ["MATLAB", "CATIA", "ANSYS Fluent", "Python", "Orbital Mechanics", "SolidWorks", "CFD"],
  "Data Sciences": ["Python", "PyTorch", "SQL", "Pandas", "Spark", "Tableau", "scikit-learn", "R", "Airflow"],
  Statistics: ["R", "Python", "SAS", "SQL", "Bayesian Modeling", "Tableau", "Excel"],
  "Information Sciences & Technology": ["SQL", "Python", "Figma", "JavaScript", "Tableau", "Agile", "Jira", "Power BI"],
  Cybersecurity: ["Wireshark", "Python", "Linux", "Burp Suite", "Splunk", "Network Security", "Bash", "Nmap"],
  Mathematics: ["Python", "MATLAB", "LaTeX", "R", "Optimization", "Probability", "C++"],
  "Actuarial Science": ["Excel", "VBA", "R", "SQL", "SAS", "Exam P", "Exam FM", "Python", "Prophet"],
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
  "Texas Instruments", "Garmin", "John Deere", "GE Aerospace", "Penn State Health", "Nittany Lion Fund",
];

const FIRST_NAMES = [
  "Priya", "Marcus", "Elena", "Jordan", "Aisha", "Tyler", "Mei", "Diego", "Hannah", "Samuel", "Nadia", "Ethan",
  "Grace", "Omar", "Lucy", "Kenji", "Sofia", "Andre", "Maya", "Liam", "Fatima", "Noah", "Isabel", "Caleb",
  "Zara", "Owen", "Amara", "Julian", "Chloe", "Ravi", "Leah", "Mateo", "Ines", "Felix", "Tessa", "Kofi",
];

const LAST_NAMES = [
  "Raman", "Okafor", "Kowalski", "Nguyen", "Brennan", "Haddad", "Castillo", "Weiss", "Tanaka", "Murphy",
  "Abiodun", "Schultz", "Patel", "Romero", "Fischer", "Osei", "Lindqvist", "Moreau", "Chen", "Delgado",
  "Kim", "Mensah", "Novak", "Rossi", "Bauer", "Iyer", "Sullivan", "Park",
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

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

function pickMany<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];

  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }

  return picked;
}

function between(min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

/** A resume with its contact info attached. The mock API strips `contact` for locked resumes. */
export type MockResume = ResumeView & { contact: NonNullable<ResumeView["contact"]> };

function toClub({ id, slug, name, tagline, school, hue }: ClubSeed): ClubSummary {
  return { id, slug, name, tagline, school, hue };
}

function makeResume(club: ClubSeed, index: number, createdAt: Date): MockResume {
  const primaryMajor = pick(club.majors);
  const hasSecondMajor = random() < 0.18;
  const majors = hasSecondMajor ? [primaryMajor, pick(club.majors.filter((m) => m !== primaryMajor))] : [primaryMajor];

  const gradYear = pick([2026, 2027, 2027, 2028, 2028, 2029]);
  const degree: Degree = random() < 0.85 ? "BS" : random() < 0.75 ? "MS" : "PhD";

  // Juniors and younger want internships; seniors mostly want full-time, some want both.
  const seeking: Seeking[] =
    gradYear >= 2028
      ? ["internship"]
      : gradYear === 2027
        ? random() < 0.3
          ? ["internship", "full-time"]
          : ["internship"]
        : random() < 0.75
          ? ["full-time"]
          : ["internship", "full-time"];

  const skillPool = majors.flatMap((major) => SKILLS_BY_MAJOR[major] ?? []);
  const skills = pickMany([...new Set(skillPool)], between(4, 12));

  const experience = pickMany(ORGS, between(1, 3)).map((org) => ({
    title: pick(ROLES_BY_MAJOR[primaryMajor] ?? ["Intern"]),
    org,
  }));

  // About a quarter of students are in a second club's book too.
  const otherClub = random() < 0.25 ? pick(CLUB_SEEDS.filter((other) => other.id !== club.id)) : null;
  const books = [club, ...(otherClub ? [otherClub] : [])].map((seed) => ({ id: `book_${seed.slug}`, club: toClub(seed) }));

  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);

  return {
    id: `res_${club.slug}_${index + 1}`,
    school: { name: club.school, domain: SCHOOL_DOMAIN },
    books,
    profile: { gradYear, majors, degree, seeking, skills, experience },
    contact: { name: `${first} ${last}`, email: `${first}.${last}@psu.edu`.toLowerCase() },
    createdAt: createdAt.toISOString(),
  };
}

export const RESUMES: MockResume[] = (() => {
  const all: MockResume[] = [];
  let minutesAgo = 0;

  for (const club of CLUB_SEEDS) {
    for (let i = 0; i < club.size; i++) {
      minutesAgo += between(7, 190);
      all.push(makeResume(club, i, new Date(Date.UTC(2026, 9, 11, 16) - minutesAgo * 60_000)));
    }
  }

  return all;
})();

export const CLUBS: ClubSummary[] = CLUB_SEEDS.map(toClub);

export const BOOKS: BookSummary[] = CLUB_SEEDS.map((seed) => ({
  id: `book_${seed.slug}`,
  club: toClub(seed),
  resumeCount: RESUMES.filter((resume) => resume.books.some((book) => book.club.id === seed.id)).length,
  priceCents: seed.priceCents,
}));

/** Students waiting for an officer to accept them, three per club. Not visible to recruiters. */
export const PENDING: MockResume[] = CLUB_SEEDS.flatMap((club) =>
  Array.from({ length: 3 }, (_, i) => {
    const resume = makeResume(club, 100 + i, new Date(Date.UTC(2026, 9, 11, 16, 30 - i * 9)));
    return { ...resume, id: `req_${club.slug}_${i + 1}`, books: [{ id: `book_${club.slug}`, club: toClub(club) }] };
  }),
);

/** Companies that already bought a book, for dashboard history. */
export const PAST_UNLOCKS: Record<string, { company: string; minutesAgo: number }[]> = {
  "book_psu-hkn": [
    { company: "Lutron", minutesAgo: 42 },
    { company: "AccuWeather", minutesAgo: 190 },
  ],
  "book_psu-swe": [{ company: "Boeing", minutesAgo: 75 }],
};
