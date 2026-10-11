"use client";

import { useState } from "react";

import { submitResume } from "@/frontend/lib/api/actions";
import type { ParsedResume } from "@/frontend/lib/api/types";

import { EMPTY_PROFILE, type ResumeDraft } from "./steps/resume-review-step";

/**
 * State for the "add my resume" path, shared by /setup and /join/[slug]:
 * chosen books → uploaded PDF → reviewed profile + consent → submitted requests.
 */
export function useResumeDraft(initialBookIds: string[]) {
  const [bookIds, setBookIds] = useState(initialBookIds);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [parseFailed, setParseFailed] = useState(false);
  const [draft, setDraft] = useState<ResumeDraft>({ name: "", profile: EMPTY_PROFILE });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function acceptUpload(upload: { uploadId: string; parsed: ParsedResume | null }) {
    setUploadId(upload.uploadId);
    setParseFailed(upload.parsed === null);
    setDraft(upload.parsed ? { name: upload.parsed.contact.name, profile: upload.parsed.profile } : { name: "", profile: EMPTY_PROFILE });
  }

  /** Resolves `true` once the requests are saved. */
  async function submit(): Promise<boolean> {
    if (!uploadId || !consent) return false;

    setSubmitting(true);
    setError(null);

    try {
      await submitResume({
        bookIds,
        uploadId,
        name: draft.name.trim(),
        // Half-filled experience rows are dropped rather than sent with blanks.
        profile: { ...draft.profile, experience: draft.profile.experience.filter((job) => job.title.trim() && job.org.trim()) },
        consent: true,
      });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't send your request. Try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { bookIds, setBookIds, parseFailed, draft, setDraft, consent, setConsent, submitting, error, acceptUpload, submit };
}
