"use client";

import "@aws-amplify/ui-react/styles.layer.css";

import { Authenticator } from "@aws-amplify/ui-react";
import { useEffect, useRef, type ReactNode } from "react";

import styles from "./themed-authenticator.module.css";

type ThemedAuthenticatorProps = {
  mode: "signIn" | "signUp";
  /** School signups: the email must be on one of these domains, e.g. ["psu.edu"]. */
  emailDomains?: string[];
  /** Runs once, as soon as Cognito reports the user is signed in. */
  onAuthenticated: () => void | Promise<void>;
};

/**
 * Amplify's `<Authenticator>`, restyled to match the app (see the CSS module) and with our
 * own copy on each screen. Cognito handles the code email, password rules, and resets.
 */
export function ThemedAuthenticator({ mode, emailDomains, onAuthenticated }: ThemedAuthenticatorProps) {
  const domainHint = emailDomains?.length ? `you@${emailDomains[0]}` : "you@company.com";

  return (
    <div className={styles.theme}>
      <Authenticator
        initialState={mode}
        hideSignUp={mode === "signIn"}
        loginMechanisms={["email"]}
        formFields={{
          signIn: {
            username: { label: "Email", placeholder: "Email", labelHidden: true },
            password: { label: "Password", placeholder: "Password", labelHidden: true },
          },
          signUp: {
            email: { label: "Email", placeholder: domainHint, labelHidden: true, order: 1 },
            password: { label: "Password", placeholder: "Password: 8+ characters, with a number", labelHidden: true, order: 2 },
            confirm_password: { label: "Confirm password", placeholder: "Confirm password", labelHidden: true, order: 3 },
          },
          confirmSignUp: {
            confirmation_code: { label: "Code", placeholder: "6-digit code", labelHidden: true },
          },
          forgotPassword: {
            username: { label: "Email", placeholder: "Email", labelHidden: true },
          },
          confirmResetPassword: {
            confirmation_code: { label: "Code", placeholder: "6-digit code", labelHidden: true },
            password: { label: "New password", placeholder: "New password", labelHidden: true },
            confirm_password: { label: "Confirm password", placeholder: "Confirm password", labelHidden: true },
          },
        }}
        services={{
          async validateCustomSignUp(formData) {
            if (!emailDomains?.length) return;
            const email = String(formData.email ?? "").toLowerCase();
            if (!emailDomains.some((domain) => email.endsWith(`@${domain}`))) {
              return { email: `Use your @${emailDomains[0]} email so your club can verify you.` };
            }
          },
        }}
        components={{
          SignIn: { Header: () => <Heading title="Log in" /> },
          SignUp: { Header: () => <Heading title="Create your account" lead={emailDomains?.length ? `Use your @${emailDomains[0]} email.` : "Use your work email."} /> },
          ConfirmSignUp: { Header: () => <Heading title="Check your email" lead="We sent you a 6-digit code. It expires in 24 hours." /> },
          ForgotPassword: { Header: () => <Heading title="Reset your password" lead="We'll email you a code." /> },
          ConfirmResetPassword: { Header: () => <Heading title="Choose a new password" /> },
        }}
      >
        {() => <OnAuthenticated run={onAuthenticated} />}
      </Authenticator>
    </div>
  );
}

function Heading({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className={styles.heading}>
      <h1>{title}</h1>
      {lead && <p>{lead}</p>}
    </div>
  );
}

/** The Authenticator renders this once signed in; it hands off exactly once. */
function OnAuthenticated({ run }: { run: () => void | Promise<void> }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  return (
    <div className={styles.handoff} role="status">
      <span className={styles.spinner} aria-hidden />
      Signing you in…
    </div>
  );
}
