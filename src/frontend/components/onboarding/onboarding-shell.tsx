import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ProgressBar } from "@/frontend/components/ui/progress";

import styles from "./onboarding-shell.module.css";

type OnboardingShellProps = {
  /** 0 to 1. */
  progress: number;
  /** Where the X goes. */
  exitHref: string;
  onBack?: () => void;
  /** Right side of the top bar, e.g. a "Log in" link. */
  aside?: ReactNode;
  /** Fixed action bar at the bottom. Omit when the step has its own submit (the Authenticator). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Full-screen, one-question-at-a-time layout for signup, setup, and joining a book:
 * a progress bar on top, the question in the middle, and the main action at the bottom.
 */
export function OnboardingShell({ progress, exitHref, onBack, aside, footer, children }: OnboardingShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        {onBack ? (
          <button type="button" className={styles.iconButton} onClick={onBack} aria-label="Back">
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
        ) : (
          <Link href={exitHref} className={styles.iconButton} aria-label="Exit">
            <X size={26} strokeWidth={3} />
          </Link>
        )}
        <div className={styles.progress}>
          <ProgressBar value={progress} label="Progress" />
        </div>
        <div className={styles.aside}>{aside}</div>
      </header>

      <main className={styles.content}>{children}</main>

      {footer && (
        <footer className={styles.footer}>
          <div className={styles.footerInner}>{footer}</div>
        </footer>
      )}
    </div>
  );
}
