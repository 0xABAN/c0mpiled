import type { ReactNode } from "react";

import type { Tone } from "@/frontend/lib/tone";

import styles from "./tag.module.css";

/** Small solid uppercase label, e.g. INTERNSHIP. */
export function Tag({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={[styles.tag, className].filter(Boolean).join(" ")} data-tone={tone}>
      {children}
    </span>
  );
}
