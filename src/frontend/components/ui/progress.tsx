import type { CSSProperties } from "react";

import type { Tone } from "@/frontend/lib/hue";

import styles from "./progress.module.css";

type ProgressBarProps = {
  /** 0 to 1. */
  value: number;
  label: string;
  hue?: Tone;
  height?: number;
};

/** Pill progress bar with a glossy highlight on the fill. */
export function ProgressBar({ value, label, hue = "accent", height = 16 }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div
      className={styles.track}
      data-hue={hue}
      style={{ "--height": `${height}px` } as CSSProperties}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <div className={styles.fill} style={{ width: `${clamped * 100}%` }} />
    </div>
  );
}
