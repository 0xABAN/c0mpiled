import { Check } from "lucide-react";
import type { ReactNode } from "react";

import styles from "./selection-card.module.css";

type SelectionCardProps = {
  /** `radio` for single choice (pass a shared `name`), `checkbox` for multi-select. */
  type: "radio" | "checkbox";
  name?: string;
  value?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** `tile`: art above centered text. `row`: art left, text, then `trailing` and an indicator. */
  layout?: "tile" | "row";
  art?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  badge?: string;
};

/** A large pressable answer card backed by a native radio or checkbox input. */
export function SelectionCard({
  type,
  name,
  value,
  checked,
  onChange,
  disabled,
  layout = "row",
  art,
  title,
  description,
  trailing,
  badge,
}: SelectionCardProps) {
  return (
    <label className={[styles.card, styles[layout], type === "checkbox" && styles.checkbox].filter(Boolean).join(" ")}>
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />

      {badge && <span className={styles.badge}>{badge}</span>}
      {art && <span className={styles.art}>{art}</span>}

      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>

      {trailing && <span className={styles.trailing}>{trailing}</span>}

      {layout === "row" && (
        <span className={styles.indicator} aria-hidden>
          <Check size={15} strokeWidth={4} />
        </span>
      )}
    </label>
  );
}
