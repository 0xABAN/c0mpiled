import { ArrowRight, BookOpenCheck } from "lucide-react";

import { LinkButton } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import type { ClubSummary } from "@/frontend/lib/api/types";
import { formatMoney, pluralize } from "@/frontend/lib/format";

import styles from "./club-card.module.css";

/** What the student home shows about a club the student runs. */
export type ClubAtAGlance = {
  club: ClubSummary;
  pendingCount: number;
  memberCount: number;
  earnedCents: number;
};

/**
 * A student may also run a club. If they do, this summarizes it and links to the dashboard;
 * if not, it offers to start selling one.
 */
export function ClubCard({ glance }: { glance: ClubAtAGlance | null }) {
  if (!glance) {
    return (
      <section className={`${styles.card} ${styles.invite}`} aria-label="Sell your club's book">
        <Monogram name="Club" tone="ink" size={48}>
          <BookOpenCheck size={24} strokeWidth={2.5} />
        </Monogram>
        <div className={styles.text}>
          <p className={styles.title}>Run a club or org?</p>
          <p className={styles.meta}>Companies pay to unlock its resume book.</p>
        </div>
        <LinkButton href="/setup?club=1" variant="outline" size="sm">
          Sell its book
        </LinkButton>
      </section>
    );
  }

  const { club, pendingCount, memberCount, earnedCents } = glance;

  return (
    <section className={styles.card} aria-label="Your club">
      <Monogram name={club.name} tone="ink" size={48} />
      <div className={styles.text}>
        <p className={styles.eyebrow}>Your club</p>
        <p className={styles.title}>{club.name}</p>
        <p className={styles.meta}>
          {pluralize(memberCount, "member")} · <strong className={styles.earned}>{formatMoney(earnedCents)} earned</strong>
        </p>
      </div>
      {pendingCount > 0 && <span className={styles.waiting}>{pendingCount} waiting</span>}
      <LinkButton href="/dashboard" variant="secondary" size="sm" aria-label={`Open ${club.name}'s dashboard`}>
        Open
        <ArrowRight size={16} strokeWidth={3} aria-hidden />
      </LinkButton>
    </section>
  );
}
