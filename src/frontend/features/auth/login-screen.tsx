"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { LinkButton } from "@/frontend/components/ui/button";
import { Logo } from "@/frontend/components/ui/logo";
import { CardStack } from "@/frontend/features/marketing/card-stack";

import { ConfigureAmplify } from "./configure-amplify";
import styles from "./login-screen.module.css";
import { ThemedAuthenticator } from "./themed-authenticator";

/** Split screen: the sign-in form on the left, product art on the right. */
export function LoginScreen({ next }: { next: string | null }) {
  const router = useRouter();

  // "/" routes each kind of account to its home.
  const onAuthenticated = useCallback(() => {
    router.replace(next ?? "/");
    router.refresh();
  }, [next, router]);

  return (
    <div className={styles.screen}>
      <ConfigureAmplify />

      <section className={styles.formSide}>
        <header className={styles.top}>
          <Logo href="/" />
          <LinkButton href="/signup" variant="outline" size="sm">
            Sign up
          </LinkButton>
        </header>

        <div className={styles.form}>
          <ThemedAuthenticator mode="signIn" onAuthenticated={onAuthenticated} />
        </div>

        <p className={styles.fineprint}>Roster connects companies with student clubs&apos; resume books.</p>
      </section>

      <section className={styles.artSide} aria-hidden>
        <div className={styles.artCopy}>
          <p className={styles.artTitle}>Every club&apos;s resume book, in one place.</p>
          <p className={styles.artLead}>Companies unlock whole books. Clubs get paid. Students get hired.</p>
        </div>
        <CardStack sticker="+$300 to HKN" />
      </section>
    </div>
  );
}
