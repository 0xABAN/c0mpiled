import { KeyRound } from "lucide-react";
import Link from "next/link";

import { LinkButton } from "@/frontend/components/ui/button";
import { Logo } from "@/frontend/components/ui/logo";
import { isDemoAccount } from "@/frontend/features/auth/demo";
import type { Viewer } from "@/frontend/lib/api/types";

import styles from "./app-header.module.css";
import { HeaderSearch } from "./header-search";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

/** Top bar for app pages: logo, navigation, global search, and the account area. */
export function AppHeader({ viewer }: { viewer: Viewer | null }) {
  const isRecruiter = viewer?.accountType === "recruiter";

  // Browsing and search are for recruiters; everyone else gets their own entry points.
  const links = [
    ...(isRecruiter ? [{ href: "/browse", label: "Browse" }] : []),
    ...(viewer?.ownedClub ? [{ href: "/dashboard", label: "My club" }] : []),
    ...(viewer?.accountType === "school" ? [{ href: "/resume", label: "My resume" }] : []),
    ...(viewer
      ? []
      : [
          { href: "/signup?as=school", label: "For clubs" },
          { href: "/signup?as=recruiter", label: "For companies" },
        ]),
  ];

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Logo compact={isRecruiter} />
        <NavLinks links={links} />

        <div className={styles.right}>
          {isRecruiter && <HeaderSearch />}

          {isRecruiter && (
            <Link href="/browse?unlocked=1" className={styles.stat} title="Resumes you've unlocked">
              <KeyRound size={20} strokeWidth={2.75} aria-hidden />
              <span className="tabular">{viewer.unlockedCount}</span>
              <span className="visually-hidden">unlocked resumes</span>
            </Link>
          )}

          {viewer && isDemoAccount(viewer.email) && (
            <span className={styles.demoBadge} title="Shared demo login. Anyone can change this data, and it resets.">
              Demo account
            </span>
          )}

          {viewer ? (
            <UserMenu viewer={viewer} />
          ) : (
            <div className={styles.auth}>
              <LinkButton href="/login" variant="outline" size="sm">
                Log in
              </LinkButton>
              <LinkButton href="/signup" variant="primary" size="sm" className={styles.signup}>
                Get started
              </LinkButton>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
