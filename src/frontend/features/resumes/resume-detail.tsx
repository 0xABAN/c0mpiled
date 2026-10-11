"use client";

import { ArrowLeft, ArrowRight, Link2, LockKeyhole, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import { Tag } from "@/frontend/components/ui/tag";
import { useToast } from "@/frontend/components/ui/toast";
import { resumePdfUrl, resumePreviewUrl } from "@/frontend/lib/api/routes";
import type { ResumeView } from "@/frontend/lib/api/types";
import { formatDegree, seekingLabel } from "@/frontend/lib/format";

import { RedactedPages } from "./redacted-pages";
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
};

/** Full-screen view of one resume: the document on the left, details and actions on the right. */
export function ResumeDetail({ resume, action, mobileAction, position, onPrevious, onNext, onClose }: ResumeDetailProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const toast = useToast();

  const { profile, contact, books } = resume;

  // Focus the dialog itself rather than its first button, so no control looks pre-selected.
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    element?.focus();

    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

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
            <ArrowLeft size={18} strokeWidth={3} aria-hidden />
          </Button>
          <Button variant="quiet" size="sm" icon aria-label="Next resume" disabled={!onNext} onClick={() => onNext?.()}>
            <ArrowRight size={18} strokeWidth={3} aria-hidden />
          </Button>
          {position && (
            <span className={`${styles.position} tabular`}>
              {position.index + 1} of {position.total}
            </span>
          )}
        </div>

        <div className={styles.topActions}>
          <Button variant="quiet" size="sm" icon aria-label="Copy link to this resume" onClick={copyLink}>
            <Link2 size={18} strokeWidth={2.75} aria-hidden />
          </Button>
          <Button variant="quiet" size="sm" icon aria-label="Close" onClick={onClose}>
            <X size={20} strokeWidth={3} aria-hidden />
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.canvas}>
          {contact ? (
            <iframe key={resume.id} className={styles.pdf} src={resumePdfUrl(resume.id)} title={`${contact.name}'s resume PDF`} />
          ) : resume.previewPageCount > 0 ? (
            // Before unlock: the real resume with identity blacked out (Contract 3).
            <div key={resume.id} className={styles.pages}>
              <RedactedPages
                pages={Array.from({ length: resume.previewPageCount }, (_, index) => resumePreviewUrl(resume.id, index + 1))}
                label="Redacted resume"
              />
            </div>
          ) : (
            // A profile summary cannot stand in for missing source pages.
            <div className={styles.unavailable} role="status">
              <h2>Resume preview unavailable</h2>
              <p>This resume doesn&apos;t have a redacted document to display.</p>
            </div>
          )}
        </div>

        <aside className={styles.panel}>
          <div className={styles.identity}>
            <span className={styles.avatar}>
              {contact ? contact.name[0] : <LockKeyhole size={26} strokeWidth={2.75} aria-hidden />}
            </span>
            <div className={styles.nameRow}>
              <h2 className={styles.name}>{contact?.name ?? "Name hidden"}</h2>
              <Tag tone="accent" className={styles.seeking}>{seekingLabel(profile.seeking)}</Tag>
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
