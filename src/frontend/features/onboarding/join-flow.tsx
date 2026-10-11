"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Button, LinkButton } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import { useToast } from "@/frontend/components/ui/toast";
import { finishSetup } from "@/frontend/lib/api/actions";
import type { BookSummary, ClubSummary, SchoolRef } from "@/frontend/lib/api/types";

import styles from "./join-flow.module.css";
import { ResumeDoneStep } from "./steps/resume-done-step";
import { ResumeReviewStep } from "./steps/resume-review-step";
import { ResumeUploadStep } from "./steps/resume-upload-step";
import { useResumeDraft } from "./use-resume-draft";

type JoinTarget = ClubSummary & { bookId: string };

/** Why this viewer can't join, or `null` when they can. */
export type JoinBlocker = "signed-out" | "recruiter" | "other-school";

type JoinFlowProps = {
  club: JoinTarget;
  blocker: JoinBlocker | null;
  /** The viewer's school, for school accounts. */
  school: SchoolRef | null;
  /** Whether finishing should also mark setup done (a student who came straight from signup). */
  finishesSetup: boolean;
};

/** A club's join link: introduce the club, then add your resume to its book. */
export function JoinFlow({ club, blocker, school, finishesSetup }: JoinFlowProps) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<"intro" | "upload" | "review" | "done">("intro");
  const [finishing, setFinishing] = useState(false);
  const resume = useResumeDraft([club.bookId]);

  // Only the club itself; counts don't matter in this flow.
  const books: BookSummary[] = [{ id: club.bookId, club, resumeCount: 0, priceCents: 0 }];
  const frameFor = (index: number, back?: () => void) => ({ progress: index / 4, exitHref: "/", onBack: back });

  async function finish() {
    setFinishing(true);

    if (finishesSetup) {
      const result = await finishSetup();
      if (result.status === "error") {
        setFinishing(false);
        return toast(result.message);
      }
    }

    router.replace("/browse");
    router.refresh();
  }

  if (step === "upload") {
    return (
      <ResumeUploadStep
        frame={frameFor(1, () => setStep("intro"))}
        onUploaded={(upload) => {
          resume.acceptUpload(upload);
          setStep("review");
        }}
      />
    );
  }

  if (step === "review" && school) {
    return (
      <ResumeReviewStep
        frame={frameFor(2, () => setStep("upload"))}
        draft={resume.draft}
        onChange={resume.setDraft}
        school={school}
        books={books}
        parseFailed={resume.parseFailed}
        redaction={resume.redaction}
        consent={resume.consent}
        onConsent={resume.setConsent}
        onSubmit={async () => (await resume.submit()) && setStep("done")}
        submitting={resume.submitting}
        error={resume.error}
      />
    );
  }

  if (step === "done") {
    return <ResumeDoneStep frame={frameFor(3)} books={books} onFinish={finish} finishing={finishing} />;
  }

  const nextPath = `/join/${club.slug}`;

  return (
    <OnboardingShell progress={0} exitHref="/">
      <div className={styles.intro}>
        <div className={styles.card} data-tone="accent">
          <Monogram name={club.name} tone="accent" size={96} />
          <p className={styles.invited}>You&apos;re invited to join</p>
          <h1 className={styles.name}>{club.name}</h1>
          <p className={styles.meta}>{[club.tagline, club.school].filter(Boolean).join(" · ")}</p>
        </div>

        <p className={styles.explain}>
          Add your resume to the club&apos;s book. Companies browse it anonymously, and your name and email are only shared when a company buys the book.
          Officers confirm every member.
        </p>

        <div className={styles.actions}>
          {blocker === null && (
            <Button variant="primary" size="lg" onClick={() => setStep("upload")}>
              Join {club.name}
            </Button>
          )}

          {blocker === "signed-out" && (
            <>
              <LinkButton href={`/signup?club=${club.slug}`} variant="primary" size="lg">
                Sign up to join
              </LinkButton>
              <LinkButton href={`/login?next=${encodeURIComponent(nextPath)}`} variant="outline" size="lg">
                I have an account
              </LinkButton>
            </>
          )}

          {blocker === "recruiter" && <p className={styles.blocked}>This link is for {club.name} members. Company accounts can find the club&apos;s book on Browse.</p>}

          {blocker === "other-school" && (
            <p className={styles.blocked}>
              {club.name} is at {club.school}, and your account is at {school?.name}. Only students at {club.school} can join.
            </p>
          )}
        </div>
      </div>
    </OnboardingShell>
  );
}
