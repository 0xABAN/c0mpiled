import type { FakeResume } from "./resume-content";

/** Fictional nonprofit candidates. Reserved emails and demo: IDs must never become real accounts. */
export const VOLUNTEER_STUDENTS: FakeResume[] = [
  {
    userId: "demo:volunteer-coordinator",
    name: "Morgan Ellis",
    email: "morgan.ellis@example.com",
    school: "Pennsylvania State University",
    profile: {
      gradYear: 2028,
      degree: "BS",
      majors: ["Industrial Engineering"],
      seeking: ["internship"],
      skills: ["Volunteering", "Volunteer Coordination", "Community Outreach", "Event Planning", "Excel", "Program Evaluation"],
      experience: [
        { title: "Volunteer Coordinator", org: "Demo Community Pantry" },
        { title: "Volunteer Team Lead", org: "Demo Campus Service Collective" },
      ],
    },
  },
  {
    userId: "demo:volunteer-fundraiser",
    name: "Taylor Brooks",
    email: "taylor.brooks@example.com",
    school: "Pennsylvania State University",
    profile: {
      gradYear: 2027,
      degree: "BS",
      majors: ["Marketing"],
      seeking: ["internship", "full-time"],
      skills: ["Volunteering", "Fundraising", "Donor Stewardship", "Grant Writing", "Email Marketing", "Canva", "Campaign Reporting"],
      experience: [
        { title: "Volunteer Fundraising Lead", org: "Demo Youth Learning Fund" },
        { title: "Community Outreach Volunteer", org: "Demo Community Pantry" },
      ],
    },
  },
  {
    userId: "demo:volunteer-data-analyst",
    name: "Casey Rivera",
    email: "casey.rivera@example.com",
    school: "Pennsylvania State University",
    profile: {
      gradYear: 2026,
      degree: "BS",
      majors: ["Data Sciences"],
      seeking: ["full-time"],
      skills: ["Volunteering", "Donor Analytics", "CRM Data Management", "SQL", "Python", "Data Visualization", "Excel"],
      experience: [
        { title: "Volunteer Data Analyst", org: "Demo Nonprofit Resource Center" },
        { title: "Volunteer Impact Reporting Lead", org: "Demo Youth Learning Fund" },
      ],
    },
  },
];
