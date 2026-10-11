"use client";

import { BookOpenCheck, FileUser } from "lucide-react";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import { SelectionCard } from "@/frontend/components/ui/selection-card";

import type { StepFrame } from "../step";
import styles from "./steps.module.css";

export type Goals = { resume: boolean; club: boolean };

/** School accounts: add a resume, list a club, or both. */
export function GoalsStep({ frame, goals, onChange, onNext }: { frame: StepFrame; goals: Goals; onChange: (goals: Goals) => void; onNext: () => void }) {
  return (
    <OnboardingShell
      {...frame}
      footer={
        <Button variant="primary" size="lg" disabled={!goals.resume && !goals.club} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <Prompt title="What do you want to do?" lead="Pick one or both. You can always do the other later." />
      <div className={styles.twoUp}>
        <SelectionCard
          type="checkbox"
          layout="tile"
          checked={goals.resume}
          onChange={(resume) => onChange({ ...goals, resume })}
          art={
            <Monogram name="Resume" hue="blue" size={80}>
              <FileUser size={40} strokeWidth={2.5} />
            </Monogram>
          }
          title="Add my resume"
          description="Join your clubs' books so companies can find you."
        />
        <SelectionCard
          type="checkbox"
          layout="tile"
          checked={goals.club}
          onChange={(club) => onChange({ ...goals, club })}
          art={
            <Monogram name="Club" hue="green" size={80}>
              <BookOpenCheck size={40} strokeWidth={2.5} />
            </Monogram>
          }
          title="List my club's book"
          description="I'm an officer. Companies pay our club to unlock it."
        />
      </div>
    </OnboardingShell>
  );
}
