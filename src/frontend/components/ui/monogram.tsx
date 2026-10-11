import type { CSSProperties, ReactNode } from "react";

import { hueFor, initials, type Tone } from "@/frontend/lib/hue";

import styles from "./monogram.module.css";

type MonogramProps = {
  /** The name to abbreviate. Also picks the hue unless `hue` is given. */
  name: string;
  hue?: Tone;
  size?: number;
  shape?: "square" | "circle";
  ringed?: boolean;
  /** Replace the initials, e.g. with a lock icon. */
  children?: ReactNode;
};

export function Monogram({ name, hue, size = 40, shape = "square", ringed, children }: MonogramProps) {
  return (
    <span
      className={[styles.monogram, shape === "circle" && styles.circle, ringed && styles.ringed].filter(Boolean).join(" ")}
      data-hue={hue ?? hueFor(name)}
      style={{ "--size": `${size}px` } as CSSProperties}
      aria-hidden
    >
      <span>{children ?? initials(name)}</span>
    </span>
  );
}
