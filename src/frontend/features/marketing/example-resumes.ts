import type { ClubSummary, ResumeView } from "@/frontend/lib/api/types";

/**
 * Made-up resumes for marketing surfaces (landing, login art). Always locked: these
 * exist to show what a redacted teaser looks like, not real students.
 */

const PENN_STATE = { name: "Penn State", domain: "psu.edu" };

const club = (slug: string, name: string, hue: ClubSummary["hue"]): ClubSummary => ({
  id: `example_${slug}`,
  slug,
  name,
  tagline: null,
  school: PENN_STATE.name,
  hue,
});

export const EXAMPLE_RESUMES: ResumeView[] = [
  {
    id: "example-1",
    school: PENN_STATE,
    books: [{ id: "example_book_hkn", club: club("hkn", "Penn State HKN", "purple") }],
    profile: {
      gradYear: 2027,
      majors: ["Computer Engineering"],
      degree: "BS",
      seeking: ["internship"],
      skills: ["C++", "Verilog", "Python", "FPGA", "Embedded C"],
      experience: [
        { title: "Embedded Systems Intern", org: "Lockheed Martin" },
        { title: "Undergraduate Researcher", org: "Penn State ARL" },
      ],
    },
    previewPageCount: 0,
    contact: null,
    createdAt: "2026-10-11T15:00:00.000Z",
  },
  {
    id: "example-2",
    school: PENN_STATE,
    books: [{ id: "example_book_swe", club: club("swe", "Society of Women Engineers", "pink") }],
    profile: {
      gradYear: 2026,
      majors: ["Mechanical Engineering"],
      degree: "BS",
      seeking: ["full-time"],
      skills: ["SolidWorks", "ANSYS", "MATLAB", "GD&T"],
      experience: [{ title: "Product Development Intern", org: "Boeing" }],
    },
    previewPageCount: 0,
    contact: null,
    createdAt: "2026-10-11T14:00:00.000Z",
  },
  {
    id: "example-3",
    school: PENN_STATE,
    books: [{ id: "example_book_nai", club: club("nittany-ai", "Nittany AI Society", "teal") }],
    profile: {
      gradYear: 2027,
      majors: ["Data Sciences"],
      degree: "BS",
      seeking: ["internship", "full-time"],
      skills: ["Python", "PyTorch", "SQL", "Spark", "Airflow", "Tableau"],
      experience: [
        { title: "Machine Learning Intern", org: "Vanguard" },
        { title: "Data Science Intern", org: "AccuWeather" },
        { title: "Research Assistant", org: "Penn State Health" },
      ],
    },
    previewPageCount: 0,
    contact: null,
    createdAt: "2026-10-11T13:00:00.000Z",
  },
];
