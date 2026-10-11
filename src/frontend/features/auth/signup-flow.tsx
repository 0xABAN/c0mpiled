"use client";

import { signOut } from "aws-amplify/auth";
import { Briefcase, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { OnboardingShell } from "@/frontend/components/onboarding/onboarding-shell";
import { Prompt } from "@/frontend/components/onboarding/prompt";
import { Button } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import { SelectionCard } from "@/frontend/components/ui/selection-card";
import { createAccount } from "@/frontend/lib/api/actions";
import type { AccountType, School } from "@/frontend/lib/api/types";

import { ConfigureAmplify } from "./configure-amplify";
import { SchoolPicker } from "./school-picker";
import styles from "./signup-flow.module.css";
import { ThemedAuthenticator } from "./themed-authenticator";

type Step = "type" | "school" | "account";

type SignupFlowProps = {
  /** From `?as=`: skip the first question. */
  initialType: AccountType | null;
  /** From a club's join link: the club's school, so the school step is skipped. */
  initialSchool: School | null;
  /** From a club's join link: where to go once the account exists. */
  joinSlug: string | null;
};

/**
 * Signup: school or recruiter → (school) which school → Cognito signup with the right
 * email domain → `createAccount` → setup (or the club's join page).
 */
export function SignupFlow({ initialType, initialSchool, joinSlug }: SignupFlowProps) {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType | null>(initialType);
  const [school, setSchool] = useState<School | null>(initialSchool);
  const [step, setStep] = useState<Step>(initialType === "recruiter" || initialSchool ? "account" : initialType === "school" ? "school" : "type");
  const [accountError, setAccountError] = useState<string | null>(null);

  const steps: Step[] = accountType === "recruiter" ? ["type", "account"] : ["type", "school", "account"];
  const progress = (steps.indexOf(step) + 1) / (steps.length + 1);

  const onAuthenticated = useCallback(async () => {
    const result = await createAccount(
      accountType === "school" && school ? { accountType: "school", schoolDomain: school.domains[0] } : { accountType: "recruiter" },
    );

    if (result.status === "error") {
      setAccountError(result.message);
      return;
    }

    router.replace(joinSlug ? `/join/${joinSlug}` : "/setup");
    router.refresh();
  }, [accountType, joinSlug, router, school]);

  const back = () => setStep(steps[steps.indexOf(step) - 1]);
  const logIn = (
    <Link href={joinSlug ? `/login?next=/join/${joinSlug}` : "/login"} className={styles.logIn}>
      Log in
    </Link>
  );

  if (step === "type") {
    return (
      <OnboardingShell
        progress={progress}
        exitHref="/"
        aside={logIn}
        footer={
          <Button variant="primary" size="lg" disabled={!accountType} onClick={() => setStep(accountType === "school" ? "school" : "account")}>
            Continue
          </Button>
        }
      >
        <Prompt title="How will you use Roster?" />
        <div className={styles.types} role="radiogroup" aria-label="Account type">
          <SelectionCard
            type="radio"
            name="accountType"
            layout="tile"
            checked={accountType === "school"}
            onChange={() => setAccountType("school")}
            art={
              <Monogram name="Student" tone="ink" size={80}>
                <GraduationCap size={40} strokeWidth={2.5} />
              </Monogram>
            }
            title="I'm a student"
            description="Join your club's resume book, or list your club's book. Uses your school email."
          />
          <SelectionCard
            type="radio"
            name="accountType"
            layout="tile"
            checked={accountType === "recruiter"}
            onChange={() => setAccountType("recruiter")}
            art={
              <Monogram name="Recruiter" tone="ink" size={80}>
                <Briefcase size={38} strokeWidth={2.5} />
              </Monogram>
            }
            title="I'm hiring"
            description="Browse student clubs' resume books and unlock the ones you want."
          />
        </div>
      </OnboardingShell>
    );
  }

  if (step === "school") {
    return (
      <OnboardingShell
        progress={progress}
        exitHref="/"
        onBack={back}
        aside={logIn}
        footer={
          <Button variant="primary" size="lg" disabled={!school} onClick={() => setStep("account")}>
            Continue
          </Button>
        }
      >
        <Prompt title="Which school do you go to?" lead="Clubs only accept members from their own school." />
        <SchoolPicker selected={school} onSelect={setSchool} />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell progress={progress} exitHref="/" onBack={accountError ? undefined : back} aside={logIn}>
      <ConfigureAmplify />

      {school && (
        <p className={styles.schoolNote}>
          <Monogram name={school.name} size={28} />
          Signing up at {school.name} with your <strong>@{school.domains[0]}</strong> email
        </p>
      )}

      {accountError ? (
        <div className={styles.accountError} role="alert">
          <h1>That email doesn&apos;t match</h1>
          <p>{accountError}</p>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut();
              setAccountError(null);
              setStep(steps[0]);
            }}
          >
            Start over
          </Button>
        </div>
      ) : (
        <div className={styles.auth}>
          <ThemedAuthenticator mode="signUp" emailDomains={school?.domains} onAuthenticated={onAuthenticated} />
        </div>
      )}
    </OnboardingShell>
  );
}
