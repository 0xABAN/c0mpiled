import { Monogram } from "@/frontend/components/ui/monogram";
import type { BookUnlock } from "@/frontend/lib/api/types";
import { formatMoney, pluralize, timeAgo } from "@/frontend/lib/format";

import styles from "./side-cards.module.css";

/** Recorded club proceeds after Roster fees, not gross sales or completed payouts. */
export function EarningsCard({ unlocks, earnedCents }: { unlocks: BookUnlock[]; earnedCents: number }) {
  return (
    <section className={`${styles.card} ${styles.earnings}`} aria-labelledby="earnings-heading">
      <p id="earnings-heading" className="eyebrow">
        Earnings
      </p>
      <p className={`${styles.total} tabular`}>{formatMoney(earnedCents)}</p>
      <p className={styles.caption}>{unlocks.length > 0 ? `From ${pluralize(unlocks.length, "company", "companies")} · after Roster fees` : "No sales yet. Your first company is coming."}</p>

      {unlocks.length > 0 && (
        <ul className={styles.unlocks}>
          {unlocks.map((unlock, index) => (
            <li key={`${unlock.company}-${index}`} className={styles.unlock}>
              <Monogram name={unlock.company} size={32} />
              <span className={styles.company}>{unlock.company}</span>
              <span className={styles.amount}>
                <span className="tabular">+{formatMoney(unlock.clubPayoutCents)}</span>
                <span className={styles.when}>{timeAgo(unlock.unlockedAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
