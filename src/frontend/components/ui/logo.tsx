import Link from "next/link";

import styles from "./logo.module.css";

/** The Roster mark: a resume page with its name line redacted, on a green key. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
      <rect x="0" y="2" width="36" height="34" rx="10" fill="var(--green-lip)" />
      <rect x="0" y="0" width="36" height="31" rx="10" fill="var(--green)" />
      <path d="M10 7.5h11.5l5 5V25a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 25V9A1.5 1.5 0 0 1 10 7.5Z" fill="#fff" />
      <path d="M21.5 7.5v3.5a1.5 1.5 0 0 0 1.5 1.5h3.5" fill="var(--green-tint)" />
      <rect x="11.5" y="12" width="9" height="3.4" rx="1.7" fill="var(--ink)" />
      <rect x="11.5" y="17.6" width="12" height="2.2" rx="1.1" fill="var(--line)" />
      <rect x="11.5" y="21.4" width="8" height="2.2" rx="1.1" fill="var(--line)" />
    </svg>
  );
}

/** `compact` drops the wordmark on narrow screens, for tight headers. */
export function Logo({ href = "/", compact }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={styles.logo} aria-label="Roster home">
      <LogoMark />
      <span className={compact ? `${styles.wordmark} ${styles.compact}` : styles.wordmark}>roster</span>
    </Link>
  );
}
