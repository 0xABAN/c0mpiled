"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/frontend/components/ui/toast";
import { browseHref, EMPTY_FILTERS } from "@/frontend/features/resumes/filters";
import { completeRecruiterSetup, createClub, finishSetup } from "@/frontend/lib/api/actions";
import type { BookSummary, ClubCreated, School } from "@/frontend/lib/api/types";

import type { StepFrame } from "./step";
import { ClubDetailsStep, type ClubDetails } from "./steps/club-details-step";
import { ClubDoneStep } from "./steps/club-done-step";
import { ClubPriceStep, type ClubPricing } from "./steps/club-price-step";
import { CompanyStep, type CompanyDetails } from "./steps/company-step";
import { GoalsStep, type Goals } from "./steps/goals-step";
import { HiringStep, type Hiring } from "./steps/hiring-step";
import { ResumeBooksStep } from "./steps/resume-books-step";
import { ResumeDoneStep } from "./steps/resume-done-step";
import { ResumeReviewStep } from "./steps/resume-review-step";
import { ResumeUploadStep } from "./steps/resume-upload-step";
import { useResumeDraft } from "./use-resume-draft";

type Step =
  | "goals"
  | "club-details"
  | "club-price"
  | "club-done"
  | "resume-books"
  | "resume-upload"
  | "resume-review"
  | "resume-done"
  | "company"
  | "hiring";

type SetupFlowProps =
  | {
      accountType: "school";
      email: string;
      school: School;
      /** Books at the viewer's school. */
      books: BookSummary[];
    }
  | {
      accountType: "recruiter";
      majorOptions: string[];
      gradYearOptions: number[];
    };

/**
 * Post-signup setup. School accounts list a club and/or add their resume (club first, so
 * officers can then join their own book). Recruiters give their company and hiring defaults.
 */
export function SetupFlow(props: SetupFlowProps) {
  return props.accountType === "school" ? <SchoolSetup {...props} /> : <RecruiterSetup {...props} />;
}

function SchoolSetup({ email, school, books }: Extract<SetupFlowProps, { accountType: "school" }>) {
  const router = useRouter();
  const toast = useToast();
  const [goals, setGoals] = useState<Goals>({ resume: false, club: false });
  const [step, setStep] = useState<Step>("goals");

  const [club, setClub] = useState<ClubDetails>({ name: "", tagline: "", hue: "purple" });
  const [pricing, setPricing] = useState<ClubPricing>({ dollars: "300", payoutEmail: email });
  const [created, setCreated] = useState<ClubCreated | null>(null);
  const [creating, setCreating] = useState(false);
  const [clubError, setClubError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const resume = useResumeDraft([]);

  const steps: Step[] = [
    "goals",
    ...(goals.club ? (["club-details", "club-price", "club-done"] as const) : []),
    ...(goals.resume ? (["resume-books", "resume-upload", "resume-review", "resume-done"] as const) : []),
  ];

  const index = steps.indexOf(step);
  const next = () => setStep(steps[index + 1]);

  // No going back past a step that already saved something.
  const savedSteps: Step[] = ["club-done", "resume-done"];
  const canGoBack = index > 0 && !savedSteps.includes(step) && !(step === "resume-books" && created);
  const frame: StepFrame = { progress: (index + 1) / (steps.length + 1), exitHref: "/", onBack: canGoBack ? () => setStep(steps[index - 1]) : undefined };

  async function create() {
    setCreating(true);
    setClubError(null);

    const result = await createClub({
      name: club.name.trim(),
      tagline: club.tagline.trim() || null,
      hue: club.hue,
      priceCents: Number(pricing.dollars) * 100,
      payoutEmail: pricing.payoutEmail.trim(),
    });

    setCreating(false);
    if (result.status === "error") return setClubError(result.message);

    setCreated(result.data);
    next();
  }

  async function finish() {
    setFinishing(true);
    const result = await finishSetup();

    if (result.status === "error") {
      setFinishing(false);
      toast(result.message);
      return;
    }

    router.replace(created ? "/dashboard" : "/");
    router.refresh();
  }

  // An officer's own new club isn't in `books` yet; offer it first.
  const ownBook: BookSummary | null = created ? { id: created.bookId, club: created.club, resumeCount: 0, priceCents: Number(pricing.dollars) * 100 } : null;
  const bookChoices = ownBook ? [ownBook, ...books.filter((book) => book.id !== ownBook.id)] : books;
  const chosenBooks = bookChoices.filter((book) => resume.bookIds.includes(book.id));

  switch (step) {
    case "goals":
      return <GoalsStep frame={frame} goals={goals} onChange={setGoals} onNext={next} />;

    case "club-details":
      return <ClubDetailsStep frame={frame} school={school.name} value={club} onChange={setClub} onNext={next} />;

    case "club-price":
      return <ClubPriceStep frame={frame} value={pricing} onChange={setPricing} onSubmit={create} submitting={creating} error={clubError} />;

    case "club-done":
      return <ClubDoneStep frame={frame} created={created!} next={goals.resume ? { label: "Add my resume", onClick: next } : { label: "Go to dashboard", onClick: finish, loading: finishing }} />;

    case "resume-books":
      return <ResumeBooksStep frame={frame} school={school.name} books={bookChoices} selectedIds={resume.bookIds} onChange={resume.setBookIds} onNext={next} />;

    case "resume-upload":
      return (
        <ResumeUploadStep
          frame={frame}
          onUploaded={(upload) => {
            resume.acceptUpload(upload);
            next();
          }}
        />
      );

    case "resume-review":
      return (
        <ResumeReviewStep
          frame={frame}
          draft={resume.draft}
          onChange={resume.setDraft}
          school={{ name: school.name, domain: school.domains[0] }}
          books={chosenBooks}
          parseFailed={resume.parseFailed}
          consent={resume.consent}
          onConsent={resume.setConsent}
          onSubmit={async () => (await resume.submit()) && next()}
          submitting={resume.submitting}
          error={resume.error}
        />
      );

    case "resume-done":
      return <ResumeDoneStep frame={frame} books={chosenBooks} onFinish={finish} finishing={finishing} />;

    default:
      return null;
  }
}

function RecruiterSetup({ majorOptions, gradYearOptions }: Extract<SetupFlowProps, { accountType: "recruiter" }>) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>("company");
  const [company, setCompany] = useState<CompanyDetails>({ company: "", jobTitle: "" });
  const [hiring, setHiring] = useState<Hiring>({ seeking: [], gradYears: [], majors: [] });
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const result = await completeRecruiterSetup({ company: company.company.trim(), jobTitle: company.jobTitle.trim() || null, hiring });

    if (result.status === "error") {
      setSubmitting(false);
      toast(result.message);
      return;
    }

    router.replace(browseHref({ ...EMPTY_FILTERS, ...hiring }));
    router.refresh();
  }

  if (step === "company") {
    return <CompanyStep frame={{ progress: 1 / 3, exitHref: "/" }} value={company} onChange={setCompany} onNext={() => setStep("hiring")} />;
  }

  return (
    <HiringStep
      frame={{ progress: 2 / 3, exitHref: "/", onBack: () => setStep("company") }}
      value={hiring}
      onChange={setHiring}
      majorOptions={majorOptions}
      gradYearOptions={gradYearOptions}
      onSubmit={submit}
      submitting={submitting}
    />
  );
}
