"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./nav-links.module.css";

/** Primary navigation. The active link gets a blue label and an underline on the header rule. */
export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main">
      {links.map((link) => {
        const active = pathname === link.href.split("?")[0];
        return (
          <Link key={link.href} href={link.href} className={styles.link} aria-current={active ? "page" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
