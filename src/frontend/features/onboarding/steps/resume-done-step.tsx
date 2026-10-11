"use client";

import { Send } from "lucide-react";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Button } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import type { BookSummary } from "@/frontend/lib/api/types";

import type { StepFrame } from "../step";
import clubStyles from "./club-steps.module.css";
import styles from "./resume-steps.module.css";

type ResumeDoneStepProps = {
  frame: StepFrame;
  books: BookSummary[];
  onFinish: () => void;
  finishing: boolean;
};

/** Requests are out; nothing is visible to companies until an officer accepts. */
export function ResumeDoneStep({ frame, books, onFinish, finishing }: ResumeDoneStepProps) {
  return (
    <OnboardingShell
      {...frame}
      footer={
        <Button variant="primary" size="lg" loading={finishing} onClick={onFinish}>
          Done
        </Button>
      }
    >
      <div className={clubStyles.done}>
        <span className={clubStyles.doneBadge}>
          <Monogram name="Sent" tone="accent" size={96}>
            <Send size={44} strokeWidth={2.5} />
          </Monogram>
        </span>
        <h1 className={clubStyles.doneTitle}>{books.length > 1 ? "Requests sent!" : "Request sent!"}</h1>
        <p className={clubStyles.doneLead}>Officers check that you&apos;re a member. Once they accept, companies can find you in their book.</p>

        <ul className={styles.requests}>
          {books.map((book) => (
            <li key={book.id} className={styles.request}>
              <Monogram name={book.club.name} size={40} />
              <span className={styles.requestName}>{book.club.name}</span>
              <span className={styles.pending}>Pending</span>
            </li>
          ))}
        </ul>
      </div>
    </OnboardingShell>
  );
}
