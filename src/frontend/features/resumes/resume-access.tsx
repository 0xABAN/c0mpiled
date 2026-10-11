"use client";

import { Download, ExternalLink, LockKeyhole, Mail } from "lucide-react";

import { AnchorButton, LinkButton } from "@/frontend/components/ui/button";
import { useToast } from "@/frontend/components/ui/toast";
import { resumePdfUrl } from "@/frontend/lib/api/routes";
import type { ResumeView } from "@/frontend/lib/api/types";

import styles from "./resume-access.module.css";

/** Recruiter call to action for a locked resume. */
export function UnlockCard({ resume }: { resume: ResumeView }) {
  const { books } = resume;

  return (
    <div className={styles.unlockCard}>
      <p className="eyebrow">Locked</p>
      <h3 className={styles.unlockTitle}>See who this is</h3>
      <p className={styles.unlockBody}>
        {books.length === 1
          ? `Unlock ${books[0].club.name}'s book to see their name, email, and original PDF. The club gets paid.`
          : `They're in ${books.length} books. Unlock any one to see their name, email, and original PDF. That club gets paid.`}
      </p>

      <LinkButton href={`/unlock/${resume.id}`} variant="premium" block>
        <LockKeyhole size={18} strokeWidth={3} aria-hidden />
        Unlock resume
      </LinkButton>
    </div>
  );
}

/** Contact details and PDF downloads for an unlocked resume. */
export function ContactCard({ resumeId, email }: { resumeId: string; email: string | null }) {
  const toast = useToast();

  async function copyEmail() {
    if (!email) return;
    await navigator.clipboard.writeText(email);
    toast("Email copied");
  }

  return (
    <div className={styles.contactCard}>
      <p className="eyebrow">Unlocked</p>

      {email ? (
        <button type="button" className={styles.email} onClick={copyEmail} title="Copy email">
          <Mail size={18} strokeWidth={2.75} aria-hidden />
          {email}
        </button>
      ) : (
        <p className={styles.unlockBody}>No email on this resume.</p>
      )}

      <div className={styles.contactActions}>
        <AnchorButton href={resumePdfUrl(resumeId, { download: true })} variant="primary" block>
          <Download size={18} strokeWidth={3} aria-hidden />
          Download PDF
        </AnchorButton>
        <AnchorButton href={resumePdfUrl(resumeId)} target="_blank" rel="noreferrer" variant="outline" icon aria-label="Open PDF in a new tab">
          <ExternalLink size={18} strokeWidth={2.75} />
        </AnchorButton>
      </div>
    </div>
  );
}
