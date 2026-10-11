"use client";

import { KeyRound, LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signOut } from "@/frontend/lib/api/actions";
import type { Viewer } from "@/frontend/lib/api/types";
import { hueFor } from "@/frontend/lib/hue";

import styles from "./user-menu.module.css";

/** Avatar button with an account popover. */
export function UserMenu({ viewer }: { viewer: Viewer }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const name = viewer.company ?? viewer.ownedClub?.name ?? viewer.email;
  const subtitle = viewer.accountType === "recruiter" ? "Company account" : (viewer.school?.name ?? "School account");

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => !root.current?.contains(event.target as Node) && setOpen(false);
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.root}>
      <button
        type="button"
        className={styles.avatar}
        data-hue={hueFor(viewer.email)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
      >
        {name[0].toUpperCase()}
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.identity}>
            <p className={styles.name}>{name}</p>
            <p className={styles.email}>{viewer.email}</p>
            <p className={styles.badge}>{subtitle}</p>
          </div>

          {viewer.accountType === "recruiter" && (
            <Link href="/browse?unlocked=1" className={styles.item} role="menuitem" onClick={() => setOpen(false)}>
              <KeyRound size={18} strokeWidth={2.5} aria-hidden />
              My unlocks
            </Link>
          )}

          {viewer.ownedClub && (
            <Link href="/dashboard" className={styles.item} role="menuitem" onClick={() => setOpen(false)}>
              <LayoutDashboard size={18} strokeWidth={2.5} aria-hidden />
              Club dashboard
            </Link>
          )}

          <form action={signOut} className={styles.signOut}>
            <button type="submit" className={styles.item} role="menuitem">
              <LogOut size={18} strokeWidth={2.5} aria-hidden />
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
