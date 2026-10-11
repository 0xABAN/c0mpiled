"use client";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { TextField } from "@/frontend/components/ui/field";
import { Monogram } from "@/frontend/components/ui/monogram";

import type { StepFrame } from "../step";
import styles from "./club-steps.module.css";

export type ClubDetails = { name: string; tagline: string };

/** Name and one-line description, with a live preview of how the club appears. */
export function ClubDetailsStep({ frame, school, value, onChange, onNext }: { frame: StepFrame; school: string; value: ClubDetails; onChange: (next: ClubDetails) => void; onNext: () => void }) {
  const name = value.name.trim();

  return (
    <OnboardingShell
      {...frame}
      footer={
        <Button variant="primary" size="lg" disabled={name.length < 2} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <Prompt title="Tell us about your club" lead="This is how companies will see it." />

      <div className={styles.preview} aria-hidden>
        <Monogram name={name || "Your club"} size={64} />
        <div>
          <p className={styles.previewName}>{name || "Your club"}</p>
          <p className={styles.previewMeta}>{value.tagline.trim() || school}</p>
        </div>
      </div>

      <div className={styles.fields}>
        <TextField label="Club name" placeholder="Penn State HKN" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} autoFocus maxLength={60} />
        <TextField
          label="One-line description"
          optional
          placeholder="Electrical & computer engineering honor society"
          value={value.tagline}
          onChange={(event) => onChange({ ...value, tagline: event.target.value })}
          maxLength={80}
        />
      </div>
    </OnboardingShell>
  );
}
