"use client";

import { useEffect, useState } from "react";

import { previewRedaction } from "@/frontend/lib/api/actions";

/** Each preview re-reads the PDF and redacts it on the server, so wait for typing to settle. */
const DEBOUNCE_MS = 900;

export type RedactionPreview =
  | { status: "waiting" }
  | { status: "loading" }
  | { status: "ready"; pages: string[] }
  | { status: "error"; message: string };

/**
 * The student's uploaded PDF with their identity blacked out, exactly as recruiters will
 * see it (Contract 3). Re-runs when the name changes, since the name drives the redaction.
 */
export function useRedactionPreview(uploadId: string | null, name: string): RedactionPreview {
  const [preview, setPreview] = useState<RedactionPreview>({ status: "waiting" });
  const trimmed = name.trim();

  useEffect(() => {
    if (!uploadId || trimmed.length < 2) {
      setPreview({ status: "waiting" });
      return;
    }

    let cancelled = false;
    setPreview({ status: "loading" });

    const timer = setTimeout(async () => {
      const result = await previewRedaction(uploadId, trimmed).catch(() => ({
        status: "error" as const,
        message: "We couldn't load the preview. Edit your name to try again.",
      }));
      if (cancelled) return;
      setPreview(result.status === "ok" ? { status: "ready", pages: result.data.pages } : { status: "error", message: result.message });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, uploadId]);

  return preview;
}
