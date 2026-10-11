"use client";

import { useState } from "react";

import { submitResume } from "@/frontend/lib/api/actions";
import type { ParsedResume } from "@/frontend/lib/api/types";

import { EMPTY_PROFILE, type ResumeDraft } from "./steps/resume-review-step";
import { useRedactionPreview } from "./use-redaction-preview";

/**
 * State for the "add my resume" path, shared by /setup and /join/[slug]:
 * chosen books → uploaded PDF → reviewed profile + consent → submitted requests.
 */
export function useResumeDraft(initialBookIds: string[]) {
  const [bookIds, setBookIds] = useState(initialBookIds);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [parseFailed, setParseFailed] = useState(false);
  const [draft, setDraft] = useState<ResumeDraft>({ name: "", linkedinUrl: "", profile: EMPTY_PROFILE });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redaction = useRedactionPreview(uploadId, draft.name);

  function acceptUpload(upload: { uploadId: string; parsed: ParsedResume | null }) {
    setUploadId(upload.uploadId);
    setParseFailed(upload.parsed === null);
    setDraft(upload.parsed
      ? { name: upload.parsed.contact.name, linkedinUrl: "", profile: upload.parsed.profile }
      : { name: "", linkedinUrl: "", profile: EMPTY_PROFILE });
  }

  /** Resolves `true` once the requests are saved. */
  async function submit(): Promise<boolean> {
    if (!uploadId || !consent) return false;

    setSubmitting(true);
    setError(null);

    const result = await submitResume({
      bookIds,
      uploadId,
      name: draft.name.trim(),
      linkedinUrl: draft.linkedinUrl,
      // Half-filled experience rows are dropped rather than sent with blanks.
      profile: { ...draft.profile, experience: draft.profile.experience.filter((job) => job.title.trim() && job.org.trim()) },
      consent: true,
    });

    setSubmitting(false);
    if (result.status === "error") setError(result.message);
    return result.status === "ok";
  }

  return { bookIds, setBookIds, parseFailed, draft, setDraft, redaction, consent, setConsent, submitting, error, acceptUpload, submit };
}
