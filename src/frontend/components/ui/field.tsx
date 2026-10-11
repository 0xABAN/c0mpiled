"use client";

import { Check, CircleAlert } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";

import styles from "./field.module.css";

type TextFieldProps = Omit<ComponentProps<"input">, "size"> & {
  label: string;
  /** Keep the label for screen readers but hide it visually (auth forms use placeholders). */
  hideLabel?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  error?: string | null;
  icon?: ReactNode;
  /** Small uppercase button inside the field, e.g. "Forgot?" or "Show". */
  action?: { label: string; onClick: () => void };
  compact?: boolean;
};

export function TextField({ label, hideLabel, optional, hint, error, icon, action, compact, className, id, ...input }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={[styles.field, compact && styles.compact, icon && styles.withIcon, action && styles.withAction, className].filter(Boolean).join(" ")}>
      <label htmlFor={inputId} className={hideLabel ? "visually-hidden" : styles.label}>
        {label}
        {optional && <span className={styles.optional}>Optional</span>}
      </label>

      <div className={styles.control}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input id={inputId} className={styles.input} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
        {action && (
          <button type="button" className={styles.action} onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>

      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className={styles.error} role="alert">
          <CircleAlert size={16} strokeWidth={2.5} aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  children: ReactNode;
  /** Muted number at the end of the row, e.g. facet counts. */
  count?: number;
};

export function Checkbox({ children, count, className, ...input }: CheckboxProps) {
  return (
    <label className={[styles.check, className].filter(Boolean).join(" ")}>
      <input type="checkbox" {...input} />
      <span className={styles.box} aria-hidden>
        <Check size={15} strokeWidth={4} />
      </span>
      <span className={styles.checkLabel}>{children}</span>
      {count !== undefined && <span className={`${styles.count} tabular`}>{count}</span>}
    </label>
  );
}
