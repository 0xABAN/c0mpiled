import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

import { Monogram } from "@/frontend/components/ui/monogram";
import { Tag } from "@/frontend/components/ui/tag";
import type { ResumeView } from "@/frontend/lib/api/types";
import { formatDegree, seekingLabel } from "@/frontend/lib/format";

import { RedactedResume } from "./redacted-resume";
import styles from "./resume-card.module.css";

type ResumeCardProps = {
  resume: ResumeView;
  /** Where the card links. Opening in a new tab loads the same resume directly. */
  href: string;
  /** Intercept plain clicks to open the detail view in place. */
  onOpen?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * A compact profile thumbnail in the browse grid. The card's height follows its content
 * (experience count, skill list), which produces the masonry.
 */
export function ResumeCard({ resume, href, onOpen }: ResumeCardProps) {
  const { profile, books, contact } = resume;
  // Empty only in a student's own preview, before any club accepts them.
  const [firstBook, ...otherBooks] = books as [ResumeView["books"][number] | undefined, ...ResumeView["books"]];

  return (
    <div className={styles.wrap}>
      <Link href={href} scroll={false} className={styles.card} onClick={onOpen}>
        <div className={styles.preview}>
          <Tag className={styles.tag}>
            {seekingLabel(profile.seeking)}
          </Tag>
          <div className={styles.paper}>
            <RedactedResume resume={resume} />
          </div>
        </div>

        <div className={styles.body}>
          <h3 className={styles.title}>{contact?.name ?? profile.majors.join(" & ")}</h3>
          <p className={styles.subtitle}>
            {contact ? profile.majors.join(" & ") : formatDegree(profile.degree)} · Class of {profile.gradYear}
          </p>
        </div>
      </Link>

      <div className={styles.meta}>
        <span className={styles.club}>
          {firstBook ? (
            <>
              <Monogram name={firstBook.club.name} size={22} />
              <span className={styles.clubName}>{firstBook.club.name}</span>
            </>
          ) : (
            <span className={styles.clubName}>Not in a book yet</span>
          )}
          {otherBooks.length > 0 && (
            <span className={styles.moreClubs} title={otherBooks.map((book) => book.club.name).join(", ")}>
              +{otherBooks.length}
            </span>
          )}
        </span>

        {contact ? (
          <span className={styles.unlocked}>
            <LockKeyholeOpen size={15} strokeWidth={2.75} aria-hidden />
            Unlocked
          </span>
        ) : (
          <span className={styles.locked}>
            <LockKeyhole size={15} strokeWidth={2.75} aria-hidden />
            <span className="visually-hidden">Locked</span>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Approximate rendered height of a card, for balancing masonry columns. Tracks the parts
 * that vary: one block per job, and the skills line wrapping at roughly 44 characters.
 */
export function estimateCardHeight(resume: ResumeView): number {
  const skillLines = Math.ceil(resume.profile.skills.join(" · ").length / 44);
  return 272 + resume.profile.experience.length * 46 + skillLines * 14;
}
