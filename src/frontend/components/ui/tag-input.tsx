"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import styles from "./tag-input.module.css";

type TagInputProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Stop accepting new values at this many. */
  max?: number;
  /** Shown as one-tap additions below the field. */
  suggestions?: string[];
};

/** A list of short values edited as removable chips. Enter or comma adds; Backspace on empty removes the last. */
export function TagInput({ label, values, onChange, placeholder, max, suggestions = [] }: TagInputProps) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const full = max !== undefined && values.length >= max;

  function add(raw: string) {
    const value = raw.trim();
    const duplicate = values.some((existing) => existing.toLowerCase() === value.toLowerCase());
    if (value && !duplicate && !full) onChange([...values, value]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  const unused = suggestions.filter((suggestion) => !values.includes(suggestion)).slice(0, 8);

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {max !== undefined && (
          <span className={`${styles.count} tabular`}>
            {values.length}/{max}
          </span>
        )}
      </div>

      <div className={styles.box}>
        {values.map((value) => (
          <span key={value} className={styles.tag}>
            {value}
            <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`}>
              <X size={13} strokeWidth={3} aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className={styles.input}
          value={draft}
          placeholder={full ? "" : placeholder}
          disabled={full}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
        />
      </div>

      {unused.length > 0 && !full && (
        <div className={styles.suggestions}>
          {unused.map((suggestion) => (
            <button key={suggestion} type="button" className={styles.suggestion} onClick={() => add(suggestion)}>
              + {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
