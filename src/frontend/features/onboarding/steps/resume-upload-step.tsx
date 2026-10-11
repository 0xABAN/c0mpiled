"use client";

import { FileUp } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { ProgressBar } from "@/frontend/components/ui/progress";
import { uploadResume } from "@/frontend/lib/api/actions";
import type { ParsedResume } from "@/frontend/lib/api/types";

import type { StepFrame } from "../step";
import styles from "./resume-steps.module.css";

const MAX_BYTES = 5 * 1024 * 1024;

/** Shown while the parser runs, which takes 5–10 seconds. */
const READING_MESSAGES = ["Reading your resume…", "Finding your majors…", "Picking out your skills…", "Spotting your experience…", "Almost done…"];

type ResumeUploadStepProps = {
  frame: StepFrame;
  onUploaded: (upload: { uploadId: string; fileName: string; parsed: ParsedResume | null }) => void;
};

/** Pick a PDF, upload it, and wait for the parser. */
export function ResumeUploadStep({ frame, onUploaded }: ResumeUploadStepProps) {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function send(file: File) {
    setError(null);

    if (file.type !== "application/pdf") return setError("That file isn't a PDF. Export your resume as a PDF and try again.");
    if (file.size > MAX_BYTES) return setError("PDFs must be 5 MB or smaller.");

    setFileName(file.name);
    const body = new FormData();
    body.set("file", file);

    const result = await uploadResume(body);
    if (result.status === "error") {
      setFileName(null);
      setError(result.message);
      return;
    }

    onUploaded({ uploadId: result.uploadId, fileName: file.name, parsed: result.parsed });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void send(file);
  }

  return (
    <OnboardingShell {...frame}>
      <Prompt title="Upload your resume" lead="We'll fill in your profile from it. Companies see the details, not your name, until they unlock your club's book." />

      {fileName ? (
        <Reading fileName={fileName} />
      ) : (
        <div
          className={dragging ? `${styles.dropzone} ${styles.dragging}` : styles.dropzone}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className={styles.dropIcon} aria-hidden>
            <FileUp size={34} strokeWidth={2.5} />
          </span>
          <p className={styles.dropTitle}>Drag your resume here</p>
          <p className={styles.dropHint}>PDF, up to 5 MB</p>
          <Button variant="secondary" onClick={() => input.current?.click()}>
            Choose file
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            className="visually-hidden"
            aria-label="Resume PDF"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void send(file);
              event.target.value = "";
            }}
          />
        </div>
      )}

      {error && (
        <p className={styles.uploadError} role="alert">
          {error}
        </p>
      )}
    </OnboardingShell>
  );
}

/** Progress that eases toward 90% while we wait, with rotating messages. */
function Reading({ fileName }: { fileName: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 1400);
    return () => clearInterval(timer);
  }, []);

  const progress = 0.9 * (1 - Math.exp(-tick / 3));

  return (
    <div className={styles.reading} role="status" aria-live="polite">
      <p className={styles.fileName}>{fileName}</p>
      <ProgressBar value={Math.max(0.08, progress)} label="Reading your resume" hue="blue" height={20} />
      <p key={tick} className={styles.readingMessage}>
        {READING_MESSAGES[Math.min(tick, READING_MESSAGES.length - 1)]}
      </p>
    </div>
  );
}
