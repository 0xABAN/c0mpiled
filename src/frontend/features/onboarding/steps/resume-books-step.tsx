"use client";

import { Info } from "lucide-react";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import { SelectionCard } from "@/frontend/components/ui/selection-card";
import type { BookSummary } from "@/frontend/lib/api/types";
import { pluralize } from "@/frontend/lib/format";

import type { StepFrame } from "../step";
import shared from "./steps.module.css";

type ResumeBooksStepProps = {
  frame: StepFrame;
  school: string;
  books: BookSummary[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onNext: () => void;
};

/** Pick the clubs (at your school) whose books you belong in. */
export function ResumeBooksStep({ frame, school, books, selectedIds, onChange, onNext }: ResumeBooksStepProps) {
  const toggle = (id: string, checked: boolean) => onChange(checked ? [...selectedIds, id] : selectedIds.filter((existing) => existing !== id));

  return (
    <OnboardingShell
      {...frame}
      footer={
        <Button variant="primary" size="lg" disabled={selectedIds.length === 0} onClick={onNext}>
          Continue
        </Button>
      }
    >
      <Prompt title="Which clubs are you in?" lead={`Books at ${school}. Each club's officers confirm you're a member.`} />

      {books.length > 0 ? (
        <div className={shared.list}>
          {books.map((book) => (
            <SelectionCard
              key={book.id}
              type="checkbox"
              checked={selectedIds.includes(book.id)}
              onChange={(checked) => toggle(book.id, checked)}
              art={<Monogram name={book.club.name} size={48} />}
              title={book.club.name}
              description={[book.club.tagline, pluralize(book.resumeCount, "member")].filter(Boolean).join(" · ")}
            />
          ))}
        </div>
      ) : (
        <p className={shared.note}>
          <Info size={22} strokeWidth={2.5} aria-hidden />
          No clubs at {school} have listed a book yet. Ask an officer to create one, then use their join link.
        </p>
      )}
    </OnboardingShell>
  );
}
