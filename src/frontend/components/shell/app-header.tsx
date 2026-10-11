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
  const canBrowse = !!viewer?.accountType;

  // Every account can browse; students also get their own pages. Visitors get none: the
  // landing's doors cover signup.
  const links = [
    ...(canBrowse ? [{ href: "/browse", label: "Browse" }] : []),
    ...(viewer?.accountType === "school" ? [{ href: "/resume", label: "My resume" }] : []),
    ...(viewer?.ownedClub ? [{ href: "/dashboard", label: "My club" }] : []),
  ];

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Logo compact={canBrowse} />
        <NavLinks links={links} />

        <div className={styles.right}>
          {canBrowse && <HeaderSearch />}

          {viewer && isDemoAccount(viewer.email) && (
            <span className={styles.demoBadge} title="Shared demo login. Anyone can change this data, and it resets.">
              Demo<span className={styles.demoFull}> account</span>
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
