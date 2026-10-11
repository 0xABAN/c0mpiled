import type { ResumeProfile, Seeking } from "@/backend/parsing/types";

/**
 * Invented students for seed and demo data. Everyone here is made up. Each generator has its
 * own fixed PRNG seed, so a script produces the same people on every run.
 */

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

/** A deterministic source of names, profiles, and random choices. */
export function fakePeople(seed: number) {
  const random = seeded(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

  function pickMany<T>(items: readonly T[], howMany: number): T[] {
    const pool = [...items];
    const picked: T[] = [];
    while (picked.length < howMany && pool.length > 0) picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    return picked;
  }

  /** A plausible profile for a student in one of `majors` (keys of the tables above). */
  function profile(majors: readonly string[]): ResumeProfile {
    const primaryMajor = pick(majors);
    const studentMajors = random() < 0.18 ? [primaryMajor, pick(majors.filter((major) => major !== primaryMajor))] : [primaryMajor];
    const gradYear = pick([2026, 2027, 2027, 2028, 2028, 2029]);

    // Juniors and younger want internships; seniors mostly want full-time.
    const seeking: Seeking[] =
      gradYear >= 2028 ? ["internship"]
      : gradYear === 2027 ? (random() < 0.3 ? ["internship", "full-time"] : ["internship"])
      : random() < 0.75 ? ["full-time"] : ["internship", "full-time"];

    return {
      gradYear,
      majors: studentMajors,
      degree: random() < 0.85 ? "BS" : random() < 0.75 ? "MS" : "PhD",
      seeking,
      skills: pickMany([...new Set(studentMajors.flatMap((major) => SKILLS_BY_MAJOR[major]))], between(4, 12)),
      experience: pickMany(ORGS, between(1, 3)).map((org) => ({ title: pick(ROLES_BY_MAJOR[primaryMajor]), org })),
    };
  }

  return {
    random,
    pick,
    between,
    profile,
    name: () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
  };
}
