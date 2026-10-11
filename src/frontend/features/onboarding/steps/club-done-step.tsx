"use client";

import { BookOpenCheck, Copy } from "lucide-react";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Button } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import { useToast } from "@/frontend/components/ui/toast";
import type { ClubCreated } from "@/frontend/lib/api/types";

import type { StepFrame } from "../step";
import styles from "./club-steps.module.css";

type ClubDoneStepProps = {
  frame: StepFrame;
  created: ClubCreated;
  /** Label and action for the main button: "Add my resume" when that's next, otherwise the dashboard. */
  next: { label: string; onClick: () => void; loading?: boolean };
};

/** The club exists. The one thing officers need now is the join link. */
export function ClubDoneStep({ frame, created, next }: ClubDoneStepProps) {
  const toast = useToast();

  async function copy() {
    await navigator.clipboard.writeText(created.joinUrl);
    toast("Join link copied");
  }

  return (
    <OnboardingShell
      {...frame}
      footer={
        <Button variant="primary" size="lg" loading={next.loading} onClick={next.onClick}>
          {next.label}
        </Button>
      }
    >
      <div className={styles.done}>
        <span className={styles.doneBadge}>
          <Monogram name={created.club.name} hue={created.club.hue} size={96}>
            <BookOpenCheck size={46} strokeWidth={2.5} />
          </Monogram>
        </span>
        <h1 className={styles.doneTitle}>{created.club.name} is live!</h1>
        <p className={styles.doneLead}>Send this link to your members. They sign in with their school email and request to join; you accept them on your dashboard.</p>

        <div className={styles.linkBox}>
          <code>{created.joinUrl}</code>
          <Button variant="secondary" size="sm" onClick={copy}>
            <Copy size={16} strokeWidth={3} aria-hidden />
            Copy link
          </Button>
        </div>
        <p className={styles.shareHint}>Tip: drop it in your club&apos;s GroupMe or Slack.</p>
      </div>
    </OnboardingShell>
  );
}
