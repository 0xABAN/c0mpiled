import { ArrowRight, BookOpenCheck, Briefcase } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LinkButton } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import { DemoLogin } from "@/frontend/features/auth/demo-login";
import type { Hue } from "@/frontend/lib/api/types";

import { CardStack } from "./card-stack";
import styles from "./landing.module.css";

/** Public home page: one line of pitch, then a door for each audience. */
export function Landing() {
  return (
    <>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          Every club&apos;s resume book.
          <br />
          <em>One place.</em>
        </h1>

        <nav className={styles.doors} aria-label="Get started">
          <Door href="/signup?as=school" hue="green" icon={<BookOpenCheck size={30} strokeWidth={2.5} />} who="I run a club" action="Sell our book" />
          <Door href="/signup?as=recruiter" hue="purple" icon={<Briefcase size={30} strokeWidth={2.5} />} who="I'm hiring" action="Search them all" />
        </nav>

        <DemoLogin label="Peek inside first" stacked />
      </section>

      <section className={`${styles.showcase} grid-field`} aria-hidden>
        <CardStack sticker="+$300 to HKN" />
      </section>

      <section className={styles.closing}>
        <div className={styles.closingBand}>
          <h2 className={styles.closingTitle}>Get your club paid.</h2>
          <LinkButton href="/signup?as=school" variant="inverse" size="lg" className={styles.closingButton}>
            Get started
          </LinkButton>
        </div>
      </section>

      <footer className={styles.footer}>Built at c0mpiled · Penn State · 2026</footer>
    </>
  );
}

type DoorProps = { href: string; hue: Hue; icon: ReactNode; who: string; action: string };

/** A big pressable card that starts signup as one kind of account. */
function Door({ href, hue, icon, who, action }: DoorProps) {
  return (
    <Link href={href} className={styles.door}>
      <Monogram name={who} hue={hue} size={60}>
        {icon}
      </Monogram>
      <span className={styles.doorText}>
        <span className={styles.doorWho}>{who}</span>
        <span className={styles.doorAction}>{action}</span>
      </span>
      <ArrowRight className={styles.doorArrow} size={26} strokeWidth={3} aria-hidden />
    </Link>
  );
}
