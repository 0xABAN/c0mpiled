"use client";

import { ArrowLeft, Check, Heart, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";

import { Button, LinkButton } from "@/frontend/components/ui/button";
import { Chip } from "@/frontend/components/ui/chip";
import { Monogram } from "@/frontend/components/ui/monogram";
import { SelectionCard } from "@/frontend/components/ui/selection-card";
import { Tag } from "@/frontend/components/ui/tag";
import { browseHref, EMPTY_FILTERS } from "@/frontend/features/resumes/filters";
import { RedactedResume } from "@/frontend/features/resumes/redacted-resume";
import { unlockBook } from "@/frontend/lib/api/actions";
import type { UnlockOffer, UnlockQuote, UnlockResult } from "@/frontend/lib/api/types";
import { formatMoney, pluralize } from "@/frontend/lib/format";
import { seekingHue, seekingLabel } from "@/frontend/lib/hue";

import styles from "./checkout.module.css";
import { UnlockSuccess } from "./unlock-success";

/**
 * Companies unlock a club's whole book. This page starts from one resume, shows which
 * book(s) would reveal it, and where the money goes.
 */
export function Checkout({ quote }: { quote: UnlockQuote }) {
  const { resume, offers } = quote;
  const [selectedId, setSelectedId] = useState(quote.recommendedBookId);
  const [result, setResult] = useState<UnlockResult | null>(null);
  const [isUnlocking, startUnlocking] = useTransition();

  const selected = offers.find((offer) => offer.book.id === selectedId) ?? offers[0];
  const hue = seekingHue(resume.profile.seeking);

  // "Best value" means the lowest price per resume, whichever book is preselected.
  const bestValueId = [...offers].sort((a, b) => perResumeCents(a) - perResumeCents(b))[0]?.book.id;

  function unlock() {
    startUnlocking(async () => {
      const next = await unlockBook(selected.book.id, resume.id);
      if (next.status === "checkout") window.location.assign(next.url);
      setResult(next);
    });
  }

  if (result?.status === "unlocked") {
    return <UnlockSuccess resume={resume} result={result} />;
  }

  // Checked after `result`: the purchase itself refreshes the quote with contact info filled in.
  if (resume.contact) {
    return <AlreadyUnlocked resumeId={resume.id} />;
  }

  return (
    <div className={styles.page}>
      <Link href={browseHref(EMPTY_FILTERS, resume.id)} className={styles.back}>
        <ArrowLeft size={18} strokeWidth={3} aria-hidden />
        Back to resume
      </Link>

      <div className={styles.layout}>
        <div className={styles.main}>
          <header className={styles.intro}>
            <p className={`eyebrow ${styles.eyebrow}`}>Unlock</p>
            <h1 className={styles.title}>
              {offers.length === 1 ? `Unlock the ${offers[0].book.club.name} book` : "Unlock a resume book"}
            </h1>
            <p className={styles.lead}>
              {offers.length === 1
                ? "This candidate is in their book. Unlock it to see them and every other member: names, emails, and original PDFs."
                : `This candidate is in ${offers.length} books. Unlocking any one of them reveals them, plus everyone else in it.`}
            </p>
          </header>

          <section className={styles.preview} data-hue={hue} aria-label="The resume you started from">
            <div className={styles.previewPaper}>
              <RedactedResume resume={resume} size="card" />
            </div>
            <div className={styles.previewText}>
              <Tag hue={hue}>{seekingLabel(resume.profile.seeking)}</Tag>
              <h2 className={styles.previewTitle}>{resume.profile.majors.join(" & ")}</h2>
              <p className={styles.previewMeta}>
                {resume.school.name} · Class of {resume.profile.gradYear}
              </p>
              <div className={styles.previewChips}>
                {resume.profile.skills.slice(0, 6).map((skill) => (
                  <Chip key={skill} small>
                    {skill}
                  </Chip>
                ))}
                {resume.profile.skills.length > 6 && <Chip small>+{resume.profile.skills.length - 6}</Chip>}
              </div>
            </div>
          </section>

          <section aria-labelledby="book-heading">
            <h2 id="book-heading" className={styles.sectionTitle}>
              {offers.length === 1 ? "The book" : "Choose a book"}
            </h2>

            {offers.length === 1 ? (
              <div className={styles.bookCard}>
                <BookOffer offer={offers[0]} />
              </div>
            ) : (
              <div className={styles.offerList} role="radiogroup" aria-labelledby="book-heading">
                {offers.map((offer) => (
                  <SelectionCard
                    key={offer.book.id}
                    type="radio"
                    name="book"
                    value={offer.book.id}
                    checked={offer.book.id === selected.book.id}
                    onChange={() => setSelectedId(offer.book.id)}
                    badge={offer.book.id === bestValueId ? "Best value" : undefined}
                    art={<Monogram name={offer.book.club.name} hue={offer.book.club.hue} size={48} />}
                    title={offer.book.club.name}
                    description={describeBook(offer)}
                    trailing={<span className={`${styles.price} tabular`}>{formatMoney(offer.priceCents)}</span>}
                  />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="includes-heading">
            <h2 id="includes-heading" className={styles.sectionTitle}>
              What you get
            </h2>
            <ul className={styles.checklist}>
              <CheckItem>Names and verified school emails for all {pluralize(selected.book.resumeCount, "member")}</CheckItem>
              <CheckItem>Every original PDF, to download or share with your team</CheckItem>
              <CheckItem>Only students the club accepted as real members</CheckItem>
            </ul>
          </section>
        </div>

        <aside className={styles.summary} aria-label="Order summary">
          <OrderSummary offer={selected} />

          <Button variant="primary" size="lg" block loading={isUnlocking} onClick={unlock}>
            <LockKeyhole size={18} strokeWidth={3} aria-hidden />
            {selected.priceCents === 0 ? "Unlock with my plan" : `Unlock for ${formatMoney(selected.priceCents)}`}
          </Button>

          {result?.status === "error" && (
            <p className={styles.error} role="alert">
              {result.message}
            </p>
          )}

          <p className={styles.fineprint}>Test mode: you won&apos;t be charged.</p>
        </aside>
      </div>
    </div>
  );
}

function AlreadyUnlocked({ resumeId }: { resumeId: string }) {
  return (
    <div className={styles.already}>
      <h1 className={styles.title}>You already have this resume</h1>
      <p className={styles.lead}>One of its books is unlocked for your company.</p>
      <LinkButton href={browseHref(EMPTY_FILTERS, resumeId)} variant="primary" size="lg">
        View resume
      </LinkButton>
    </div>
  );
}

function perResumeCents(offer: UnlockOffer) {
  return Math.round(offer.priceCents / Math.max(1, offer.book.resumeCount));
}

function describeBook(offer: UnlockOffer) {
  return `${pluralize(offer.book.resumeCount, "resume")} · about ${formatMoney(perResumeCents(offer))} each`;
}

/** Static version of the offer card, for the common single-book case. */
function BookOffer({ offer }: { offer: UnlockOffer }) {
  const { club } = offer.book;

  return (
    <>
      <Monogram name={club.name} hue={club.hue} size={56} />
      <div className={styles.bookText}>
        <p className={styles.bookName}>{club.name}</p>
        {club.tagline && <p className={styles.bookTagline}>{club.tagline}</p>}
        <p className={styles.bookMeta}>{describeBook(offer)}</p>
      </div>
      <span className={`${styles.price} tabular`}>{formatMoney(offer.priceCents)}</span>
    </>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className={styles.checkItem}>
      <span className={styles.checkBullet} aria-hidden>
        <Check size={15} strokeWidth={4} />
      </span>
      {children}
    </li>
  );
}

/** Line items plus a bar showing how much of the price reaches the club. */
function OrderSummary({ offer }: { offer: UnlockOffer }) {
  const { club } = offer.book;
  const feeCents = offer.priceCents - offer.clubPayoutCents;
  const clubShare = offer.priceCents > 0 ? offer.clubPayoutCents / offer.priceCents : 0;

  return (
    <div className={styles.summaryCard}>
      <p className="eyebrow">Order summary</p>

      <div className={styles.lineItem}>
        <span>{club.name} book</span>
        <span className="tabular">{formatMoney(offer.priceCents)}</span>
      </div>

      <div className={styles.split}>
        <div className={styles.splitBar} role="img" aria-label={`${Math.round(clubShare * 100)}% goes to ${club.name}`}>
          <span style={{ width: `${clubShare * 100}%` }} />
        </div>

        <div className={`${styles.lineItem} ${styles.toClub}`}>
          <span>
            <Heart size={15} strokeWidth={3} aria-hidden /> To {club.name}
          </span>
          <span className="tabular">{formatMoney(offer.clubPayoutCents)}</span>
        </div>

        {/* No fee is decided yet; show the row only once there is one. */}
        {feeCents > 0 ? (
          <div className={`${styles.lineItem} ${styles.fee}`}>
            <span>Roster fee</span>
            <span className="tabular">{formatMoney(feeCents)}</span>
          </div>
        ) : (
          <p className={styles.fee}>All of it goes to the club.</p>
        )}
      </div>

      <div className={`${styles.lineItem} ${styles.total}`}>
        <span>Total today</span>
        <span className="tabular">{formatMoney(offer.priceCents)}</span>
      </div>
    </div>
  );
}
