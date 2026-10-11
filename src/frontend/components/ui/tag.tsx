import type { ReactNode } from "react";

import type { Tone } from "@/frontend/lib/hue";

import styles from "./tag.module.css";

/** Small solid uppercase label, e.g. INTERNSHIP. */
export function Tag({ hue, children, className }: { hue: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={[styles.tag, className].filter(Boolean).join(" ")} data-hue={hue}>
      {children}
    </span>
  );
}
