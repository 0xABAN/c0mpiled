"use client";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { TextField } from "@/frontend/components/ui/field";
import { Monogram } from "@/frontend/components/ui/monogram";

import type { StepFrame } from "../step";
import shared from "./steps.module.css";

export type CompanyDetails = { company: string; jobTitle: string };

/** Recruiters: who they hire for. */
export function CompanyStep({ frame, value, onChange, onNext }: { frame: StepFrame; value: CompanyDetails; onChange: (next: CompanyDetails) => void; onNext: () => void }) {
  return (
    <OnboardingShell
      {...frame}
      footer={
        <Button variant="primary" size="lg" disabled={value.company.trim().length < 2} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <Prompt title="Where do you work?" lead="Clubs see which companies bought their book." />

      <div className={shared.stack}>
        <TextField
          label="Company"
          placeholder="Acme Robotics"
          icon={value.company.trim() ? <Monogram name={value.company} size={26} /> : undefined}
          value={value.company}
          onChange={(event) => onChange({ ...value, company: event.target.value })}
          autoFocus
          maxLength={80}
        />
        <TextField
          label="Your title"
          optional
          placeholder="University Recruiter"
          value={value.jobTitle}
          onChange={(event) => onChange({ ...value, jobTitle: event.target.value })}
          maxLength={80}
        />
      </div>
    </OnboardingShell>
  );
}
