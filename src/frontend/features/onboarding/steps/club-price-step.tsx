"use client";

import { HandCoins } from "lucide-react";
import { useId } from "react";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { ToggleChip } from "@/frontend/components/ui/chip";
import { TextField } from "@/frontend/components/ui/field";

import type { StepFrame } from "../step";
import styles from "./club-steps.module.css";
import shared from "./steps.module.css";

/** What clubs charge for resume books by hand today (AGENTS.md). */
const PRESET_DOLLARS = [250, 400, 650];
const MIN_DOLLARS = 25;

export type ClubPricing = { dollars: string; payoutEmail: string };

type ClubPriceStepProps = {
  frame: StepFrame;
  value: ClubPricing;
  onChange: (next: ClubPricing) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
};

/** The book's price and where earnings go. Creates the club on submit. */
export function ClubPriceStep({ frame, value, onChange, onSubmit, submitting, error }: ClubPriceStepProps) {
  const priceId = useId();
  const dollars = Number(value.dollars);
  const validPrice = Number.isInteger(dollars) && dollars >= MIN_DOLLARS;
  const validEmail = /^\S+@\S+\.\S+$/.test(value.payoutEmail);

  return (
    <OnboardingShell
      {...frame}
      footer={
        <Button variant="primary" size="lg" disabled={!validPrice || !validEmail} loading={submitting} onClick={onSubmit}>
          Create club
        </Button>
      }
    >
      <Prompt title="What should a company pay for your book?" lead="They get every accepted member's resume. You can change this later." />

      <div className={shared.stack}>
        <div>
          <label htmlFor={priceId} className={styles.label}>
            Book price
          </label>
          <div className={styles.priceInput}>
            <span aria-hidden>$</span>
            <input
              id={priceId}
              inputMode="numeric"
              value={value.dollars}
              onChange={(event) => onChange({ ...value, dollars: event.target.value.replace(/\D/g, "").slice(0, 5) })}
              aria-describedby={`${priceId}-hint`}
            />
          </div>
          <div className={styles.presets}>
            {PRESET_DOLLARS.map((preset) => (
              <ToggleChip key={preset} pressed={dollars === preset} onClick={() => onChange({ ...value, dollars: String(preset) })}>
                ${preset}
              </ToggleChip>
            ))}
          </div>
          <p id={`${priceId}-hint`} className={`${shared.note} ${styles.priceNote}`}>
            <HandCoins size={22} strokeWidth={2.5} aria-hidden />
            Your club keeps 95% of each sale. Roster keeps 5%. Processing costs are not included.
          </p>
        </div>

        <TextField
          label="Send earnings to"
          type="email"
          hint="Your club's treasurer or a shared officer email. Payouts are sent by hand for now."
          value={value.payoutEmail}
          onChange={(event) => onChange({ ...value, payoutEmail: event.target.value })}
        />

        {error && (
          <p className={shared.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </OnboardingShell>
  );
}
