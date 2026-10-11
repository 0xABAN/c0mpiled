"use client";

import { Check } from "lucide-react";

import type { Hue } from "@/frontend/lib/api/types";
import { HUES } from "@/frontend/lib/hue";

import styles from "./hue-picker.module.css";

/** Chunky color swatches; the club's color appears on its tiles everywhere. */
export function HuePicker({ value, onChange }: { value: Hue; onChange: (hue: Hue) => void }) {
  return (
    <div className={styles.picker} role="radiogroup" aria-label="Club color">
      {HUES.map((hue) => (
        <button
          key={hue}
          type="button"
          role="radio"
          aria-checked={hue === value}
          aria-label={hue}
          className={styles.swatch}
          data-hue={hue}
          onClick={() => onChange(hue)}
        >
          {hue === value && <Check size={22} strokeWidth={4} aria-hidden />}
        </button>
      ))}
    </div>
  );
}
