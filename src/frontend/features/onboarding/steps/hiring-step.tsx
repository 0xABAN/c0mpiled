"use client";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { ToggleChip } from "@/frontend/components/ui/chip";
import { toggle } from "@/frontend/features/resumes/filters";
import type { RecruiterSetupInput, Seeking } from "@/frontend/lib/api/types";

import type { StepFrame } from "../step";
import shared from "./steps.module.css";

export type Hiring = RecruiterSetupInput["hiring"];

type HiringStepProps = {
  frame: StepFrame;
  value: Hiring;
  onChange: (next: Hiring) => void;
  /** Majors that actually appear in resumes, most common first. */
  majorOptions: string[];
  gradYearOptions: number[];
  onSubmit: () => void;
  submitting: boolean;
};

/** Default browse filters. Everything is optional; skipping shows every resume. */
export function HiringStep({ frame, value, onChange, majorOptions, gradYearOptions, onSubmit, submitting }: HiringStepProps) {
  const seeking: { value: Seeking; label: string }[] = [
    { value: "internship", label: "Interns" },
    { value: "full-time", label: "Full-time" },
  ];

  return (
    <OnboardingShell
      {...frame}
      footer={
        <Button variant="primary" size="lg" loading={submitting} onClick={onSubmit}>
          Start browsing
        </Button>
      }
    >
      <Prompt title="Who are you hiring?" lead="We'll start your search here. Change it any time with the filters." />

      <div className={shared.stack}>
        <div>
          <p className={shared.fieldLabel}>Hiring for</p>
          <div className={shared.chips}>
            {seeking.map((option) => (
              <ToggleChip key={option.value} pressed={value.seeking.includes(option.value)} onClick={() => onChange({ ...value, seeking: toggle(value.seeking, option.value) })}>
                {option.label}
              </ToggleChip>
            ))}
          </div>
        </div>

        <div>
          <p className={shared.fieldLabel}>Graduating</p>
          <div className={shared.chips}>
            {gradYearOptions.map((year) => (
              <ToggleChip key={year} pressed={value.gradYears.includes(year)} onClick={() => onChange({ ...value, gradYears: toggle(value.gradYears, year) })}>
                {year}
              </ToggleChip>
            ))}
          </div>
        </div>

        <div>
          <p className={shared.fieldLabel}>Majors</p>
          <div className={shared.chips}>
            {majorOptions.map((major) => (
              <ToggleChip key={major} pressed={value.majors.includes(major)} onClick={() => onChange({ ...value, majors: toggle(value.majors, major) })}>
                {major}
              </ToggleChip>
            ))}
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}
