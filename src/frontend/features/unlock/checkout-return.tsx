"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { Button, LinkButton } from "@/frontend/components/ui/button";
import { confirmCheckout } from "@/frontend/lib/api/actions";
import type { CheckoutView } from "@/frontend/lib/api/types";
import { formatMoney } from "@/frontend/lib/format";

import styles from "./checkout.module.css";

/** A callback URL can be forged. Only the server's paid-product check changes this screen to unlocked. */
export function CheckoutReturn({ checkout }: { checkout: CheckoutView }) {
  const [unlocked, setUnlocked] = useState(false);
  const [message, setMessage] = useState("Checking your payment…");
  const [checking, startChecking] = useTransition();

  const verify = useCallback(() => {
    startChecking(async () => {
      try {
        const result = await confirmCheckout(checkout.id);
        if (result.status === "error") {
          setMessage(result.message);
          return;
        }
        setUnlocked(result.data.unlocked);
        setMessage(result.data.unlocked
          ? "Names, contact details, and original PDFs are now available for the book's accepted members."
          : "Payment hasn't been confirmed. The book is still locked. If you just finished checkout, check again in a moment.");
      } catch {
        setMessage("Could not confirm the result. Check again before starting another payment.");
      }
    });
  }, [checkout.id]);

  useEffect(() => { verify(); }, [verify]);

  return (
    <div className={`${styles.page} ${styles.already}`}>
      <p className={`eyebrow ${styles.eyebrow}`}>{checkout.billingMode === "sandbox" ? "Test checkout" : "Checkout"} · {formatMoney(checkout.priceCents)}</p>
      <h1 className={styles.title}>{unlocked ? "Book unlocked" : "Confirm your payment"}</h1>
      <p className={styles.lead}>{checkout.bookName}</p>
      <p className={styles.lead} role="status" aria-live="polite">{message}</p>

      {unlocked ? (
        <LinkButton href={checkout.returnPath} replace variant="primary" size="lg">View resume</LinkButton>
      ) : (
        <>
          <Button variant="primary" size="lg" loading={checking} onClick={verify}>Check payment again</Button>
          {checkout.checkoutUrl && !checkout.expired && (
            <LinkButton href={checkout.checkoutUrl} variant="secondary">{checkout.billingMode === "sandbox" ? "Continue test checkout" : "Continue checkout"}</LinkButton>
          )}
          {checkout.expired && <p className={styles.lead}>This checkout expired. Return to the resume to start another.</p>}
          <LinkButton href={checkout.returnPath} variant="ghost">Back to resume</LinkButton>
        </>
      )}
      <p className={styles.fineprint}>{checkout.billingMode === "sandbox" ? "Test mode only. No real charge or club payout occurs." : "Real payment. Club proceeds are recorded here; payouts to clubs are handled manually."}</p>
    </div>
  );
}
