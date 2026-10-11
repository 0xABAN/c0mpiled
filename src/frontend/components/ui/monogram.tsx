import type { CSSProperties, ReactNode } from "react";

import { initials } from "@/frontend/lib/format";
import type { Tone } from "@/frontend/lib/tone";

import styles from "./monogram.module.css";

type MonogramProps = {
  /** The name to abbreviate. */
  name: string;
  tone?: Tone;
  size?: number;
  shape?: "square" | "circle";
  ringed?: boolean;
  /** Replace the initials, e.g. with a lock icon. */
  children?: ReactNode;
};

export function Monogram({ name, tone = "neutral", size = 40, shape = "square", ringed, children }: MonogramProps) {
  return (
    <span
      className={[styles.monogram, shape === "circle" && styles.circle, ringed && styles.ringed].filter(Boolean).join(" ")}
      data-tone={tone}
      style={{ "--size": `${size}px` } as CSSProperties}
      aria-hidden
    >
      <span>{children ?? initials(name)}</span>
    </span>
  );
}
