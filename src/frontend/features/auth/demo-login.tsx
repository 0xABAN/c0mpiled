"use client";

import { signIn, signOut } from "aws-amplify/auth";
import { FileUser, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DEMO_ACCOUNTS, demoPassword, type DemoRole } from "@/backend/demo/accounts";
import { Button } from "@/frontend/components/ui/button";

import { ConfigureAmplify } from "./configure-amplify";
import styles from "./demo-login.module.css";

const LABELS: Record<DemoRole, string> = {
  officer: "Club officer",
  student: "Student",
};

/**
 * One-click sign-in to the shared demo accounts, so visitors can see the officer and student
 * sides without signing up. Home routing then sends each to their page.
 */
export function DemoLogin({ label = "Or try a demo:", stacked }: { label?: string; /** Label above centered buttons, for narrow columns. */ stacked?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<DemoRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function tryAs(role: DemoRole) {
    setBusy(role);
    setError(null);

    try {
      // Replace any session first; Amplify won't sign in over an existing one.
      await signOut();
      const result = await signIn({ username: DEMO_ACCOUNTS[role], password: demoPassword() });
      if (!result.isSignedIn) throw new Error("The demo account needs attention. Try again in a minute.");

      router.replace("/");
      router.refresh();
    } catch (cause) {
      setBusy(null);
      setError(cause instanceof Error ? cause.message : "Couldn't open the demo. Try again.");
    }
  }

  return (
    <div className={stacked ? `${styles.demo} ${styles.stacked}` : styles.demo}>
      <ConfigureAmplify />
      <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <Button variant="quiet" size="sm" loading={busy === "officer"} disabled={busy !== null} onClick={() => tryAs("officer")}>
          <Users size={16} strokeWidth={2.75} aria-hidden />
          {LABELS.officer}
        </Button>
        <Button variant="quiet" size="sm" loading={busy === "student"} disabled={busy !== null} onClick={() => tryAs("student")}>
          <FileUser size={16} strokeWidth={2.75} aria-hidden />
          {LABELS.student}
        </Button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
