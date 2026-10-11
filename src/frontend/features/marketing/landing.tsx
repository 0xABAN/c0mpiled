import { BadgeDollarSign, BookOpenCheck, MailCheck } from "lucide-react";
import type { ReactNode } from "react";

import { LinkButton } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";

import { DemoLogin } from "@/frontend/features/auth/demo-login";

import { CardStack } from "./card-stack";
import styles from "./landing.module.css";

/** Public home page: the pitch to clubs and to companies. */
export function Landing() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Resume books, sold for your club</p>
          <h1 className={styles.title}>
            Your club already has a resume book. Now companies can <em>buy it.</em>
          </h1>
          <p className={styles.lead}>
            Clubs sell resume books by hand today, for $250 to $650. Roster puts every book in one place: members join with their school email, officers
            approve them, and companies unlock whole books.
          </p>
          <div className={styles.ctas}>
            <LinkButton href="/signup?as=school" variant="primary" size="lg">
              List your club&apos;s book
            </LinkButton>
            <LinkButton href="/signup?as=recruiter" variant="outline" size="lg">
              Find candidates
            </LinkButton>
          </div>
          <DemoLogin label="Look around first:" />
        </div>

        <div className={`${styles.heroArt} grid-field`}>
          <CardStack sticker="+$300 to HKN" />
        </div>
      </section>

      <section className={styles.steps} aria-labelledby="how-heading">
        <h2 id="how-heading" className={styles.sectionTitle}>
          How it works
        </h2>
        <ol className={styles.stepList}>
          <Step number={1} icon={<BookOpenCheck size={28} strokeWidth={2.5} />} title="Clubs list their book">
            Set your price and share one link. Keep your sponsorship packages; this reaches companies that would never buy one.
          </Step>
          <Step number={2} icon={<MailCheck size={28} strokeWidth={2.5} />} title="Members join">
            Students sign up with their school email and request to join. Officers accept real members only.
          </Step>
          <Step number={3} icon={<BadgeDollarSign size={28} strokeWidth={2.5} />} title="Companies unlock">
            Recruiters search every book at once, preview anonymous resumes, and buy the books they want. The club gets paid.
          </Step>
        </ol>
      </section>

      <section className={styles.closing}>
        <div className={styles.closingBand}>
          <h2 className={styles.closingTitle}>Turn your resume book into club funding</h2>
          <p className={styles.closingLead}>It takes five minutes to list your existing book.</p>
          <LinkButton href="/signup?as=school" variant="inverse" size="lg" className={styles.closingButton}>
            Get started
          </LinkButton>
        </div>
      </section>

      <footer className={styles.footer}>Built at c0mpiled · Penn State · 2026</footer>
    </>
  );
}

function Step({ number, icon, title, children }: { number: number; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className={styles.step}>
      <span className={styles.stepArt}>
        <Monogram name={title} hue="accent" size={64}>
          {icon}
        </Monogram>
        <span className={styles.stepNumber}>
          {number}
        </span>
      </span>
      <h3 className={styles.stepTitle}>{title}</h3>
      <p className={styles.stepBody}>{children}</p>
    </li>
  );
}
