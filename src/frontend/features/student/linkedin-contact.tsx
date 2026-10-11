"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/frontend/components/ui/button";
import { TextField } from "@/frontend/components/ui/field";
import { useToast } from "@/frontend/components/ui/toast";
import { updateResumeLinkedIn } from "@/frontend/lib/api/actions";

import styles from "./linkedin-contact.module.css";

/** Edit private contact details without replacing the student’s resume or memberships. */
export function LinkedInContact({ linkedinUrl }: { linkedinUrl: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(linkedinUrl ?? "");
  const [saved, setSaved] = useState(linkedinUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = value.trim() !== saved;

  async function save() {
    if (saving || !changed) return;
    setSaving(true);
    setError(null);

    try {
      const result = await updateResumeLinkedIn(value);
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setValue(result.data ?? "");
      setSaved(result.data ?? "");
      toast(result.data ? "LinkedIn saved" : "LinkedIn removed");
      router.refresh();
    } catch {
      setError("Could not save LinkedIn. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className={styles.form}
      aria-label="LinkedIn contact"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <TextField
        label="LinkedIn"
        optional
        inputMode="url"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={500}
        placeholder="https://www.linkedin.com/in/your-name"
        hint="Shared only with companies that buy a book you’re in. Leave blank to remove."
        value={value}
        disabled={saving}
        error={error}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={!changed} loading={saving} aria-label="Save LinkedIn">
          Save LinkedIn
        </Button>
        {changed && (
          <Button
            variant="quiet"
            disabled={saving}
            onClick={() => {
              setValue(saved);
              setError(null);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
