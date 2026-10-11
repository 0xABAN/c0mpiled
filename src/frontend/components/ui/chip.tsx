import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import styles from "./chip.module.css";

/** A static pill, e.g. one skill. */
export function Chip({ children, small }: { children: ReactNode; small?: boolean }) {
  return <span className={[styles.chip, small && styles.small].filter(Boolean).join(" ")}>{children}</span>;
}

/** A pill that toggles on and off. Uses `aria-pressed` for its state. */
export function ToggleChip({ pressed, children, className, ...rest }: Omit<ComponentProps<"button">, "type"> & { pressed: boolean }) {
  return (
    <button type="button" aria-pressed={pressed} className={[styles.chip, styles.toggle, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}

/** An applied filter with a remove button. */
export function RemovableChip({ children, onRemove, removeLabel }: { children: ReactNode; onRemove: () => void; removeLabel: string }) {
  return (
    <span className={`${styles.chip} ${styles.active}`}>
      {children}
      <button type="button" className={styles.remove} onClick={onRemove} aria-label={removeLabel}>
        <X size={13} strokeWidth={3} aria-hidden />
      </button>
    </span>
  );
}
