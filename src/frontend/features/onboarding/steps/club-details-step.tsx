"use client";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { TextField } from "@/frontend/components/ui/field";
import { Monogram } from "@/frontend/components/ui/monogram";
import type { Hue } from "@/frontend/lib/api/types";

import { HuePicker } from "../hue-picker";
import type { StepFrame } from "../step";
import styles from "./club-steps.module.css";

export type ClubDetails = { name: string; tagline: string; hue: Hue };

/** Name, one-line description, and color, with a live preview of the club's tile. */
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

      <div className={styles.preview} data-hue={value.hue} aria-hidden>
        <Monogram name={name || "Your club"} hue={value.hue} size={64} />
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
        <div>
          <p className={styles.label}>Club color</p>
          <HuePicker value={value.hue} onChange={(hue) => onChange({ ...value, hue })} />
        </div>
      </div>
    </OnboardingShell>
  );
}
