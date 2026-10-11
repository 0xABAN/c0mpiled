"use client";

import { LockKeyholeOpen, Mail } from "lucide-react";
import type { CSSProperties } from "react";

import { LinkButton } from "@/frontend/components/ui/button";
import { browseHref, EMPTY_FILTERS } from "@/frontend/features/resumes/filters";
import { REVEAL_PARAM } from "@/frontend/features/resumes/browser";
import type { ResumeView, UnlockResult } from "@/frontend/lib/api/types";
import { formatMoney, pluralize } from "@/frontend/lib/format";
import { HUES, seekingHue } from "@/frontend/lib/hue";

import styles from "./unlock-success.module.css";

type UnlockSuccessProps = {
  resume: ResumeView;
  result: Extract<UnlockResult, { status: "unlocked" }>;
};

const CONFETTI_PIECES = 28;

/** Celebration after a purchase: who you unlocked, and what the club earned. */
export function UnlockSuccess({ resume, result }: UnlockSuccessProps) {
  const { offer, contact } = result;
  const { club } = offer.book;
  const viewHref = `${browseHref(EMPTY_FILTERS, resume.id)}&${REVEAL_PARAM}=1`;

  return (
    <div className={styles.success}>
      <Confetti />

      <span className={styles.badge} aria-hidden>
        <LockKeyholeOpen size={46} strokeWidth={2.75} />
      </span>

      <h1 className={styles.title}>Unlocked!</h1>
      <p className={styles.lead}>
        {club.name} just earned <strong className={styles.earned}>{formatMoney(offer.clubPayoutCents)}</strong>. Their whole book is
        yours, {pluralize(offer.book.resumeCount, "resume")} in all.
      </p>

      <div className={styles.person} data-hue={seekingHue(resume.profile.seeking)}>
        <span className={styles.avatar}>{contact.name[0]}</span>
        <div className={styles.personText}>
          <p className={styles.name}>
            {contact.name}
            <span className={styles.peel} aria-hidden />
          </p>
          <p className={styles.meta}>
            {resume.profile.majors.join(" & ")} · Class of {resume.profile.gradYear}
          </p>
          {contact.email && (
            <p className={styles.email}>
              <Mail size={15} strokeWidth={2.75} aria-hidden />
              {contact.email}
            </p>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <LinkButton href={viewHref} variant="primary" size="lg">
          View resume
        </LinkButton>

        <LinkButton href={browseHref({ ...EMPTY_FILTERS, clubs: [club.slug] })} variant="outline" size="lg">
          See the whole book
        </LinkButton>
      </div>
    </div>
  );
}

/** A one-shot burst of chunky confetti. Positions are derived from the index, so no randomness. */
function Confetti() {
  return (
    <div className={styles.confetti} aria-hidden>
      {Array.from({ length: CONFETTI_PIECES }, (_, index) => {
        const angle = (index / CONFETTI_PIECES) * Math.PI * 2;
        const distance = 180 + ((index * 53) % 140);

        return (
          <span
            key={index}
            data-hue={HUES[index % HUES.length]}
            style={
              {
                "--x": `${Math.cos(angle) * distance}px`,
                "--y": `${Math.sin(angle) * distance * 0.7 - 60}px`,
                "--r": `${(index * 47) % 360}deg`,
                "--delay": `${(index % 5) * 30}ms`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
