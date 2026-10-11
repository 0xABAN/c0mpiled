"use client";

import { EyeOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { ToggleChip } from "@/frontend/components/ui/chip";
import { Checkbox, TextField } from "@/frontend/components/ui/field";
import { TagInput } from "@/frontend/components/ui/tag-input";
import { ResumeCard } from "@/frontend/features/resumes/resume-card";
import type { BookSummary, Degree, ResumeProfile, SchoolRef, Seeking } from "@/frontend/lib/api/types";

import { RedactedPages } from "@/frontend/features/resumes/redacted-pages";

import type { StepFrame } from "../step";
import type { RedactionPreview } from "../use-redaction-preview";
import shared from "./steps.module.css";
import styles from "./resume-steps.module.css";

const GRAD_YEARS = [2026, 2027, 2028, 2029, 2030];
const DEGREES: Degree[] = ["BS", "MS", "PhD"];
const MAX_SKILLS = 12;
const MAX_JOBS = 3;

/** The editable resume. `gradYear` is 0 until chosen (a failed parse never guesses). */
export type ResumeDraft = { name: string; profile: ResumeProfile };

export const EMPTY_PROFILE: ResumeProfile = { gradYear: 0, majors: [], degree: "BS", seeking: [], skills: [], experience: [] };

type ResumeReviewStepProps = {
  frame: StepFrame;
  draft: ResumeDraft;
  onChange: (draft: ResumeDraft) => void;
  school: SchoolRef;
  books: BookSummary[];
  /** The parser couldn't read the PDF, so the fields start empty. */
  parseFailed: boolean;
  /** The uploaded PDF with identity blacked out; submitting needs it to have succeeded. */
  redaction: RedactionPreview;
  consent: boolean;
  onConsent: (consent: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
};

/** Check what the parser found, see the card companies will see, and consent. */
export function ResumeReviewStep(props: ResumeReviewStepProps) {
  const { frame, draft, onChange, school, books, parseFailed, redaction, consent, onConsent, onSubmit, submitting, error } = props;
  const { profile } = draft;

  const setProfile = (patch: Partial<ResumeProfile>) => onChange({ ...draft, profile: { ...profile, ...patch } });
  const toggleSeeking = (value: Seeking) =>
    setProfile({ seeking: profile.seeking.includes(value) ? profile.seeking.filter((item) => item !== value) : [...profile.seeking, value] });

  const complete = draft.name.trim() !== "" && profile.gradYear > 0 && profile.majors.length > 0 && profile.seeking.length > 0;
  const clubNames = books.map((book) => book.club.name).join(" and ");

  const preview = {
    id: "preview",
    school,
    books: books.map((book) => ({ id: book.id, club: book.club })),
    profile: { ...profile, majors: profile.majors.length ? profile.majors : ["Your major"], seeking: profile.seeking.length ? profile.seeking : (["internship"] as Seeking[]) },
    previewPageCount: 0,
    contact: null,
    createdAt: new Date(0).toISOString(),
  };

  return (
    <OnboardingShell
      {...frame}
      wide
      footer={
        <Button variant="primary" size="lg" disabled={!complete || !consent || redaction.status !== "ready"} loading={submitting} onClick={onSubmit}>
          {books.length > 1 ? "Send requests" : "Send request"}
        </Button>
      }
    >
      <Prompt
        title={parseFailed ? "Fill in your profile" : "Does this look right?"}
        lead={parseFailed ? "We couldn't read your PDF automatically, so add the basics yourself." : "We read this from your resume. Fix anything we got wrong."}
      />

      <div className={styles.review}>
        <div className={styles.editor}>
          <TextField
            label="Your name"
            hint="Hidden from companies until they unlock your club's book."
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
          />

          <div>
            <p className={shared.fieldLabel}>Graduating</p>
            <div className={shared.chips}>
              {GRAD_YEARS.map((year) => (
                <ToggleChip key={year} pressed={profile.gradYear === year} onClick={() => setProfile({ gradYear: year })}>
                  {year}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div>
            <p className={shared.fieldLabel}>Degree</p>
            <div className={shared.chips}>
              {DEGREES.map((degree) => (
                <ToggleChip key={degree} pressed={profile.degree === degree} onClick={() => setProfile({ degree })}>
                  {degree}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div>
            <p className={shared.fieldLabel}>Looking for</p>
            <div className={shared.chips}>
              <ToggleChip pressed={profile.seeking.includes("internship")} onClick={() => toggleSeeking("internship")}>
                Internship
              </ToggleChip>
              <ToggleChip pressed={profile.seeking.includes("full-time")} onClick={() => toggleSeeking("full-time")}>
                Full-time
              </ToggleChip>
            </div>
          </div>

          <TagInput label="Majors" values={profile.majors} onChange={(majors) => setProfile({ majors })} placeholder="Add a major" max={3} />
          <TagInput label="Skills" values={profile.skills} onChange={(skills) => setProfile({ skills })} placeholder="Add a skill and press Enter" max={MAX_SKILLS} />

          <div className={styles.jobs}>
            <p className={shared.fieldLabel}>Experience</p>
            {profile.experience.map((job, index) => (
              <div key={index} className={styles.job}>
                <TextField
                  label="Title"
                  compact
                  value={job.title}
                  onChange={(event) => setProfile({ experience: profile.experience.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)) })}
                />
                <TextField
                  label="Organization"
                  compact
                  value={job.org}
                  onChange={(event) => setProfile({ experience: profile.experience.map((item, i) => (i === index ? { ...item, org: event.target.value } : item)) })}
                />
                <Button
                  variant="quiet"
                  size="sm"
                  icon
                  aria-label={`Remove ${job.title || "this job"}`}
                  onClick={() => setProfile({ experience: profile.experience.filter((_, i) => i !== index) })}
                >
                  <Trash2 size={16} strokeWidth={2.75} />
                </Button>
              </div>
            ))}
            {profile.experience.length < MAX_JOBS && (
              <Button variant="ghost" size="sm" className={styles.addJob} onClick={() => setProfile({ experience: [...profile.experience, { title: "", org: "" }] })}>
                <Plus size={16} strokeWidth={3} aria-hidden />
                Add experience
              </Button>
            )}
          </div>

          <RedactionSection redaction={redaction} />

          <div className={styles.consent}>
            <Checkbox checked={consent} onChange={(event) => onConsent(event.target.checked)}>
              Share my resume with companies that unlock {clubNames}&apos;s book. I can leave a book any time.
            </Checkbox>
          </div>

          {error && (
            <p className={shared.error} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className={styles.previewColumn}>
          <p className={styles.previewLabel}>What companies see</p>
          <div inert>
            <ResumeCard resume={preview} href="#" />
          </div>
          <p className={styles.privacy}>Your name, email, and PDF stay hidden until a company buys the book.</p>
        </div>
      </div>
    </OnboardingShell>
  );
}

/** "Here's your resume as companies see it", with the redaction status. */
function RedactionSection({ redaction }: { redaction: RedactionPreview }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={styles.redaction} aria-labelledby="redaction-heading" aria-busy={redaction.status === "loading"}>
      <div className={styles.redactionHeader}>
        <p id="redaction-heading" className={shared.fieldLabel}>
          <EyeOff size={16} strokeWidth={2.75} aria-hidden /> Your resume, as companies see it
        </p>
        {redaction.status === "ready" && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Smaller" : "Bigger"}
          </Button>
        )}
      </div>

      {redaction.status === "waiting" && <p className={styles.redactionNote}>Enter your name above. We black out your name, contact info, links, and photos.</p>}
      {redaction.status === "loading" && <p className={styles.redactionNote}>Blacking out your details…</p>}
      {redaction.status === "error" && (
        <p className={shared.error} role="alert">
          {redaction.message}
        </p>
      )}
      {redaction.status === "ready" && (
        <div className={expanded ? styles.redactionPagesBig : styles.redactionPages}>
          <RedactedPages pages={redaction.pages} label="Your redacted resume" />
        </div>
      )}
    </section>
  );
}
