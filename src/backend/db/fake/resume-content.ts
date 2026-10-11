import { createHash } from "node:crypto";

import type { ResumeProfile } from "@/backend/parsing/types";

export type FakeResume = {
  userId: string;
  name: string;
  email: string;
  school: string;
  profile: ResumeProfile;
};

type Project = { name: string; bullets: string[] };
type Field = { courses: string; bullets: string[]; projects: Project[] };

/** Fictional work samples, deliberately matched to the student's existing major and roles. */
const FIELDS: Record<string, Field> = {
  software: {
    courses: "Data Structures, Operating Systems, Database Design",
    bullets: [
      "Built {count} API regression checks covering authentication, pagination, and invalid input handling.",
      "Reduced query latency by {percent}% in a staging benchmark by batching reads and adding targeted indexes.",
      "Implemented a background import worker with retry limits and progress reporting for operations staff.",
      "Migrated {count} integration cases into continuous testing and documented reproducible local test data.",
      "Added structured request logs and traced an intermittent timeout across service boundaries.",
      "Shipped an accessible internal search interface after reviewing keyboard navigation with the design team.",
    ],
    projects: [
      { name: "Campus Event Finder", bullets: ["Built a searchable calendar with date filters and saved events for student organizations.", "Added duplicate detection and validated {count} event-import cases with automated tests."] },
      { name: "Course Planner", bullets: ["Modeled prerequisites as a directed graph and flagged conflicting semester plans.", "Compared generated schedules against {count} hand-checked cases and documented unsupported inputs."] },
      { name: "Shared Study Queue", bullets: ["Implemented room-based study queues with live status updates and bounded request handling.", "Measured response times under concurrent traffic and reduced repeated database reads by {percent}%."] },
    ],
  },
  hardware: {
    courses: "Digital Systems, Embedded Design, Signals and Systems",
    bullets: [
      "Automated {count} bench measurements and compared sensor readings against calibrated reference equipment.",
      "Traced intermittent communication faults using captured waveforms and documented the reproducible trigger.",
      "Evaluated power consumption across operating modes and reduced idle draw by {percent}% in a lab prototype.",
      "Reviewed schematic changes and maintained a test matrix covering voltage, temperature, and timing limits.",
      "Implemented a buffered sensor acquisition path and verified sample ordering during sustained operation.",
      "Investigated signal noise on a prototype board and validated revised filtering against the original design.",
    ],
    projects: [
      { name: "Low-Power Environmental Logger", bullets: ["Designed a periodic sampling loop with local storage and recovery after unexpected power loss.", "Collected {count} comparison runs and documented accuracy, battery life, and enclosure trade-offs."] },
      { name: "Motor Control Test Bench", bullets: ["Built a closed-loop controller and measured transient response under changing mechanical loads.", "Added safe operating limits and a repeatable procedure for checking controller stability."] },
      { name: "Digital Timing Analyzer", bullets: ["Captured timed input sequences and identified jitter and missing transitions in recorded traces.", "Verified {count} edge cases, including wraparound, simultaneous transitions, and interrupted capture."] },
    ],
  },
  engineering: {
    courses: "Mechanics of Materials, Thermodynamics, Numerical Methods",
    bullets: [
      "Evaluated {count} design configurations against stiffness, weight, and manufacturing constraints.",
      "Reduced assembly mass by {percent}% in a prototype study while retaining the required safety factor.",
      "Compared simulation results with bench measurements and documented assumptions behind the boundary conditions.",
      "Prepared dimensioned drawings and reviewed tolerance stack-ups with the manufacturing team.",
      "Designed a repeatable load test and summarized the observed failure modes for the next design revision.",
      "Updated a component model after fit checks and recorded the effect of each revision on assembly clearance.",
    ],
    projects: [
      { name: "Lightweight Instrument Mount", bullets: ["Designed a bracket around load and clearance constraints, then compared two fabrication approaches.", "Validated predicted deflection with {count} measurements and revised the model using test results."] },
      { name: "Thermal Test Fixture", bullets: ["Built a benchtop fixture to compare cooling configurations under repeatable heat input.", "Reported temperature uncertainty and reduced the measured peak temperature by {percent}%."] },
      { name: "Portable Inspection Rig", bullets: ["Developed a compact fixture with adjustable alignment features and replaceable wear surfaces.", "Documented the bill of materials, assembly procedure, and results from repeated setup trials."] },
    ],
  },
  operations: {
    courses: "Operations Research, Production Systems, Supply Chain Analytics",
    bullets: [
      "Mapped {count} order-processing cases and identified recurring delays between scheduling and fulfillment.",
      "Reduced modeled queue time by {percent}% by comparing staffing allocations under observed demand patterns.",
      "Built a weekly exception report linking inventory discrepancies to their source transactions.",
      "Reviewed supplier lead-time variation and documented reorder assumptions for the planning team.",
      "Validated a process simulation against historical throughput and summarized sensitivity to arrival rates.",
      "Standardized work instructions after observing handoffs and incorporated feedback from floor operators.",
    ],
    projects: [
      { name: "Inventory Reorder Simulator", bullets: ["Compared reorder policies across variable demand and lead-time scenarios.", "Reported stockout frequency and holding cost over {count} simulated operating periods."] },
      { name: "Campus Delivery Routing", bullets: ["Modeled capacity and time-window constraints for a small campus delivery network.", "Reduced total simulated travel distance by {percent}% relative to a nearest-stop baseline."] },
      { name: "Service Queue Study", bullets: ["Collected arrival and service observations, then modeled congestion at peak demand.", "Presented staffing alternatives with explicit assumptions and confidence intervals."] },
    ],
  },
  chemical: {
    courses: "Transport Phenomena, Reaction Engineering, Process Control",
    bullets: [
      "Reconciled {count} process measurements with material balances and flagged readings outside instrument tolerance.",
      "Compared operating conditions in a process model and identified a {percent}% reduction in simulated utility demand.",
      "Prepared a sampling plan and documented handling procedures before a controlled pilot run.",
      "Reviewed process trends with the engineering team and separated startup transients from steady-state behavior.",
      "Checked a heat-exchanger model against reference calculations and documented fouling assumptions.",
      "Updated operating procedures after a hazard review and added clear limits for the monitored variables.",
    ],
    projects: [
      { name: "Heat Recovery Study", bullets: ["Modeled a small process heat-recovery network under variable inlet conditions.", "Compared {count} operating scenarios and reported utility demand and temperature constraints."] },
      { name: "Batch Reactor Model", bullets: ["Simulated reaction progress and evaluated the effect of temperature on conversion.", "Validated numerical results against a simplified analytical case and documented model limitations."] },
      { name: "Separation Process Review", bullets: ["Compared two separation configurations using consistent feed and product specifications.", "Summarized recovery, energy use, and equipment assumptions in a design report."] },
    ],
  },
  data: {
    courses: "Probability, Statistical Inference, Linear Algebra",
    bullets: [
      "Cleaned and reconciled {count} data-quality exceptions before preparing a reproducible analysis dataset.",
      "Improved validation error by {percent}% over a documented baseline without using held-out observations during fitting.",
      "Built an analysis pipeline with explicit missing-value handling and repeatable train-validation splits.",
      "Compared model residuals across subgroups and documented cases where aggregate accuracy hid systematic errors.",
      "Created a weekly reporting notebook with source checks, summary tables, and interpretable diagnostic plots.",
      "Reviewed assumptions with domain specialists and presented uncertainty alongside the central estimates.",
    ],
    projects: [
      { name: "Transit Demand Forecast", bullets: ["Joined weather and ridership data, then evaluated rolling forecasts against a seasonal baseline.", "Compared {count} validation windows and documented drift and missing-observation effects."] },
      { name: "Survey Sampling Study", bullets: ["Simulated sampling strategies and compared estimator bias under uneven response rates.", "Produced reproducible confidence-interval summaries with clearly stated assumptions."] },
      { name: "Model Monitoring Dashboard", bullets: ["Tracked input distributions, missing values, and prediction errors across successive datasets.", "Added threshold-based review flags and reduced repetitive manual checks by {percent}%."] },
    ],
  },
  finance: {
    courses: "Financial Accounting, Risk Management, Applied Statistics",
    bullets: [
      "Reconciled {count} reporting exceptions against source records and documented the adjustments for review.",
      "Reduced recurring reconciliation work by {percent}% by separating input checks from the reporting model.",
      "Built scenario tables to compare outcomes under changing rate, growth, and expense assumptions.",
      "Reviewed model formulas and added reasonableness checks before preparing a summary for the analyst team.",
      "Compared historical results with forecast assumptions and highlighted the largest sources of variance.",
      "Prepared a concise risk summary distinguishing observed results from assumptions requiring further evidence.",
    ],
    projects: [
      { name: "Portfolio Risk Workbook", bullets: ["Compared allocation strategies using historical returns and explicitly bounded rebalancing rules.", "Stress-tested {count} market scenarios and reported drawdown and concentration risk."] },
      { name: "Claims Scenario Model", bullets: ["Modeled frequency and severity separately and compared aggregate outcomes across assumptions.", "Documented sensitivity to tail events and validated calculations against small hand-worked cases."] },
      { name: "Company Valuation Study", bullets: ["Built a transparent forecast with linked operating assumptions and a sensitivity table.", "Presented a valuation range rather than a single estimate and documented the supporting inputs."] },
    ],
  },
  product: {
    courses: "Human-Computer Interaction, Information Systems, Database Design",
    bullets: [
      "Reviewed {count} user-reported issues and grouped them into reproducible workflow and usability problems.",
      "Reduced task completion time by {percent}% in a small usability study after simplifying the primary workflow.",
      "Mapped stakeholder requirements to acceptance criteria and maintained a traceable release checklist.",
      "Built a prototype with keyboard-accessible controls and recorded findings from moderated feedback sessions.",
      "Validated reporting definitions against source data and resolved inconsistent metrics across internal dashboards.",
      "Prepared annotated interface specifications and checked the implementation against the agreed interaction states.",
    ],
    projects: [
      { name: "Student Services Portal", bullets: ["Prototyped a searchable service directory with clear eligibility and contact information.", "Tested {count} navigation tasks and revised labels based on observed misunderstandings."] },
      { name: "Research Feedback Tracker", bullets: ["Organized interview notes into themes and linked product decisions to supporting observations.", "Added an accessible review workflow for assigning and resolving follow-up questions."] },
      { name: "Campus Resource Dashboard", bullets: ["Defined consistent reporting metrics and built views for comparing usage over time.", "Documented source limitations and reduced repeated manual reporting steps by {percent}%."] },
    ],
  },
  security: {
    courses: "Network Security, Secure Systems, Digital Forensics",
    bullets: [
      "Triaged {count} lab alerts and documented the evidence used to distinguish suspicious activity from benign events.",
      "Reduced duplicate alert volume by {percent}% after testing revised detection rules against labeled sample traffic.",
      "Reproduced configuration weaknesses in an isolated lab and prepared clear remediation steps for review.",
      "Reviewed access permissions against documented roles and identified stale or overbroad assignments.",
      "Built a repeatable log-analysis workflow and preserved timestamps and source context for each finding.",
      "Validated remediation changes using the original test cases and recorded the remaining limitations.",
    ],
    projects: [
      { name: "Isolated Detection Lab", bullets: ["Built a segmented test environment to study benign and suspicious network activity safely.", "Evaluated {count} labeled cases and reported precision, missed detections, and noisy rules."] },
      { name: "Access Review Toolkit", bullets: ["Compared sample role assignments with a least-privilege policy and generated reviewable exceptions.", "Added tests for inherited permissions and documented cases requiring human judgment."] },
      { name: "Incident Timeline Builder", bullets: ["Normalized sample event timestamps and linked related records without modifying source evidence.", "Produced a searchable timeline with explicit uncertainty for incomplete or conflicting events."] },
    ],
  },
  marketing: {
    courses: "Consumer Behavior, Marketing Research, Business Analytics",
    bullets: [
      "Audited {count} campaign records and reconciled tracking definitions before preparing performance comparisons.",
      "Improved signup conversion by {percent}% in a bounded landing-page experiment with a documented comparison period.",
      "Built an audience research summary separating interview findings from assumptions requiring further validation.",
      "Developed an editorial calendar and coordinated reviews across design, copy, and campaign owners.",
      "Compared channel performance using consistent attribution windows and reported the limitations of the analysis.",
      "Revised campaign messaging after structured feedback sessions and documented the rationale for each change.",
    ],
    projects: [
      { name: "Student Event Campaign", bullets: ["Designed a campaign brief with audience segments, channel choices, and measurable objectives.", "Reviewed {count} response records and compared engagement across the planned channels."] },
      { name: "Local Business Research", bullets: ["Conducted a structured competitor review and summarized gaps in positioning and customer messaging.", "Presented recommendations with explicit evidence, assumptions, and low-cost validation steps."] },
      { name: "Campaign Measurement Dashboard", bullets: ["Unified sample campaign records and defined consistent engagement and conversion metrics.", "Added data-quality checks and reduced repetitive weekly reporting work by {percent}%."] },
    ],
  },
};

const FIELD_BY_MAJOR: Record<string, keyof typeof FIELDS> = {
  "Computer Science": "software",
  "Computer Engineering": "hardware",
  "Electrical Engineering": "hardware",
  "Mechanical Engineering": "engineering",
  "Aerospace Engineering": "engineering",
  "Industrial Engineering": "operations",
  "Supply Chain": "operations",
  "Chemical Engineering": "chemical",
  "Data Sciences": "data",
  Statistics: "data",
  Mathematics: "data",
  "Actuarial Science": "finance",
  Finance: "finance",
  "Information Sciences & Technology": "product",
  Cybersecurity: "security",
  Marketing: "marketing",
};

/** Service-focused work replaces generic industry examples, not the student's degree coursework. */
const VOLUNTEER_WORK: Omit<Field, "courses"> = {
  bullets: [
    "Organized {count} volunteer shifts for community programs, including onboarding and accessible event check-in.",
    "Maintained a donor follow-up tracker with consent preferences, acknowledgment dates, and clear staff handoffs.",
    "Reconciled {count} donation and attendance records before preparing a nonprofit program-impact summary.",
    "Coordinated a fundraising campaign with volunteer outreach, event logistics, and donor thank-you messages.",
    "Reviewed volunteer scheduling gaps and documented changes that reduced missed handoffs by {percent}% in a sample review.",
    "Prepared grant-research notes and separated verified service outcomes from estimates in reports for nonprofit staff.",
  ],
  projects: [
    { name: "Volunteer Shift Planner", bullets: ["Planned community-service shifts around volunteer availability, accessibility needs, and program capacity.", "Documented check-in and reminder procedures for {count} fictional volunteers using consent-based contact lists."] },
    { name: "Community Fundraising Campaign", bullets: ["Developed a nonprofit campaign brief linking donor outreach, volunteer responsibilities, and event costs.", "Prepared donation acknowledgments and a campaign report using synthetic gift records, not real donor data."] },
    { name: "Nonprofit Impact Dashboard", bullets: ["Summarized volunteer hours, service attendance, and donation trends from a fictional nonprofit dataset.", "Checked {count} sample records for duplicates and missing values, then documented limits of the impact measures."] },
  ],
};

/** Stable variation: rerenders of one fictional person keep the same details and dates. */
export function fakeResumeContent(student: FakeResume) {
  const education = FIELDS[FIELD_BY_MAJOR[student.profile.majors[0]]];
  if (!education) throw new Error(`No fictional resume content defined for ${student.profile.majors[0]}.`);
  const field = student.profile.skills.includes("Volunteering") ? VOLUNTEER_WORK : education;

  const seed = createHash("sha256").update(student.userId).digest().readUInt32BE(0);
  const fill = (text: string, index: number) => text
    .replaceAll("{count}", String(24 + (seed + index * 13) % 67))
    .replaceAll("{percent}", String(12 + (seed + index * 7) % 19));
  const year = Math.min(2026, student.profile.gradYear);
  const dates = [`May ${year} - Aug ${year}`, `Jan ${year} - Apr ${year}`, `Sep ${year - 1} - Dec ${year - 1}`];
  const degree = { BS: "Bachelor of Science", MS: "Master of Science", PhD: "Doctor of Philosophy" }[student.profile.degree];
  const duration = { BS: 4, MS: 2, PhD: 5 }[student.profile.degree];

  return {
    degree: `${degree} in ${student.profile.majors.join(" and ")}`,
    educationDates: `Aug ${student.profile.gradYear - duration} - May ${student.profile.gradYear}`,
    courses: education.courses,
    phone: `814-555-${String(100 + seed % 100).padStart(4, "0")}`,
    portfolio: `example.com/${student.name.toLowerCase().replaceAll(" ", "-")}`,
    experience: student.profile.experience.map((job, index) => ({
      ...job,
      dates: dates[index],
      location: index % 2 === 0 ? "On-site" : "Hybrid",
      bullets: [0, 1].map((offset) => fill(field.bullets[(seed + index * 2 + offset) % field.bullets.length], index * 2 + offset)),
    })),
    projects: [0, 1].map((index) => {
      const project = field.projects[(seed + index) % field.projects.length];
      return {
        name: project.name,
        tools: student.profile.skills.slice(index * 2, index * 2 + 3).join(", "),
        dates: index === 0 ? `Sep ${year} - Present` : `Jan ${year} - Apr ${year}`,
        bullets: project.bullets.map((bullet, offset) => fill(bullet, 10 + index * 2 + offset)),
      };
    }),
  };
}
