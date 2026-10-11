import type { ReactNode } from "react";

import { LogoMark } from "@/frontend/components/ui/logo";

import styles from "./prompt.module.css";

/** The question for an onboarding step, said by our mark in a speech bubble. */
export function Prompt({ title, lead }: { title: ReactNode; lead?: ReactNode }) {
  return (
    <div className={styles.prompt}>
      <span className={styles.mark}>
        <LogoMark size={76} />
      </span>
      <div className={styles.bubble}>
        <h1 className={styles.title}>{title}</h1>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
    </div>
  );
}
