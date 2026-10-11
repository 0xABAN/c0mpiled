"use client";

import { ArrowLeft, ArrowRight, Link2, LockKeyhole, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/frontend/components/ui/button";
import { Chip } from "@/frontend/components/ui/chip";
import { Monogram } from "@/frontend/components/ui/monogram";
import { Tag } from "@/frontend/components/ui/tag";
import { useToast } from "@/frontend/components/ui/toast";
import { resumePdfUrl, resumePreviewUrl } from "@/frontend/lib/api/routes";
import type { ResumeView } from "@/frontend/lib/api/types";
import { formatDegree, seekingLabel } from "@/frontend/lib/format";

import { RedactedPages } from "./redacted-pages";
import { RedactedResume } from "./redacted-resume";
import styles from "./resume-detail.module.css";

type ResumeDetailProps = {
  resume: ResumeView;
  /** Pinned to the bottom of the panel: unlock on browse, accept/reject on the club dashboard. */
  action: ReactNode;
  /** One compact button for the fixed bar on small screens, where the panel sits below the document. */
  mobileAction?: ReactNode;
  /** "4 of 128", when the resume was opened from the grid. */
  position: { index: number; total: number } | null;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
  /** Play the un-redaction animation (arriving from a purchase). */
  revealing?: boolean;
};

/** Full-screen view of one resume: the document on the left, details and actions on the right. */
export function ResumeDetail({ resume, action, mobileAction, position, onPrevious, onNext, onClose, revealing }: ResumeDetailProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const [view, setView] = useState<"summary" | "pdf">("summary");

  const { profile, contact, books } = resume;

  // Focus the dialog itself rather than its first button, so no control looks pre-selected.
  useEffect(() => {
    dialog.current?.showModal();
    dialog.current?.focus();
  }, []);

  // Each resume starts on its summary.
  useEffect(() => setView("summary"), [resume.id]);

  // Arrow keys step through results, unless the user is typing.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft" && onPrevious) onPrevious();
      if (event.key === "ArrowRight" && onNext) onNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onNext, onPrevious]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    toast("Link copied");
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      tabIndex={-1}
      aria-label={contact ? `Resume of ${contact.name}` : `Resume: ${profile.majors.join(" & ")}, class of ${profile.gradYear}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.topbar}>
        <div className={styles.stepper}>
          <Button variant="quiet" size="sm" icon aria-label="Previous resume" disabled={!onPrevious} onClick={() => onPrevious?.()}>
            <ArrowLeft size={18} strokeWidth={3} />
          </Button>
          <Button variant="quiet" size="sm" icon aria-label="Next resume" disabled={!onNext} onClick={() => onNext?.()}>
            <ArrowRight size={18} strokeWidth={3} />
          </Button>
          {position && (
            <span className={`${styles.position} tabular`}>
              {position.index + 1} of {position.total}
            </span>
          )}
        </div>

        <div className={styles.topActions}>
          <Button variant="quiet" size="sm" icon aria-label="Copy link to this resume" onClick={copyLink}>
            <Link2 size={18} strokeWidth={2.75} />
          </Button>
          <Button variant="quiet" size="sm" icon aria-label="Close" onClick={onClose}>
            <X size={20} strokeWidth={3} />
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.canvas}>
          {contact && (
            <div className={styles.viewTabs} role="tablist" aria-label="Resume view">
              <button type="button" role="tab" aria-selected={view === "summary"} className={styles.viewTab} onClick={() => setView("summary")}>
                Summary
              </button>
              <button type="button" role="tab" aria-selected={view === "pdf"} className={styles.viewTab} onClick={() => setView("pdf")}>
                Original PDF
              </button>
            </div>
          )}

          {view === "pdf" && contact ? (
            <iframe className={styles.pdf} src={resumePdfUrl(resume.id)} title={`${contact.name}'s resume PDF`} />
          ) : !contact && resume.previewPageCount > 0 ? (
            // Before unlock: the real resume with identity blacked out (Contract 3).
            <div key={resume.id} className={styles.pages}>
              <RedactedPages
                pages={Array.from({ length: resume.previewPageCount }, (_, index) => resumePreviewUrl(resume.id, index + 1))}
                label="Redacted resume"
              />
            </div>
          ) : (
            // Seed resumes have no rendered pages, so draw the document from the profile.
            <div key={resume.id} className={styles.sheet}>
              <RedactedResume resume={resume} size="full" revealing={revealing} />
            </div>
          )}
        </div>

        <aside className={styles.panel}>
          <div className={styles.identity}>
            <span className={styles.avatar}>
              {contact ? contact.name[0] : <LockKeyhole size={26} strokeWidth={2.75} aria-hidden />}
            </span>
            <div className={styles.identityText}>
              <div className={styles.nameRow}>
                <h2 className={styles.name}>{contact?.name ?? "Name hidden"}</h2>
                <Tag>{seekingLabel(profile.seeking)}</Tag>
              </div>
              <p className={styles.headline}>
                {profile.majors.join(" & ")} · Class of {profile.gradYear}
              </p>
            </div>
          </div>

          <PanelSection title={books.length > 1 ? "In these books" : "In this book"}>
            <div className={styles.rows}>
              {books.map((book) => (
                <OrgRow key={book.id} name={book.club.name} detail={book.club.tagline ?? book.club.school} />
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Education">
            <div className={styles.rows}>
              <OrgRow name={resume.school.name} detail={`${formatDegree(profile.degree)}, ${profile.majors.join(" & ")} · ${profile.gradYear}`} />
            </div>
          </PanelSection>

          <PanelSection title="Experience">
            <div className={styles.rows}>
              {profile.experience.map((job, index) => (
                <OrgRow key={`${job.org}-${index}`} name={job.org} detail={job.title} />
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Skills">
            <div className={styles.chips}>
              {profile.skills.map((skill) => (
                <Chip key={skill}>{skill}</Chip>
              ))}
            </div>
          </PanelSection>

          <div className={styles.cta}>{action}</div>
        </aside>
      </div>

      {mobileAction && <div className={styles.mobileBar}>{mobileAction}</div>}
    </dialog>
  );
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function OrgRow({ name, detail }: { name: string; detail: string }) {
  return (
    <div className={styles.orgRow}>
      <Monogram name={name} size={36} />
      <div className={styles.orgText}>
        <p className={styles.orgName}>{name}</p>
        <p className={styles.orgDetail}>{detail}</p>
      </div>
    </div>
  );
}
