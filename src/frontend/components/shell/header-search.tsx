"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import styles from "./header-search.module.css";

const DEBOUNCE_MS = 250;

/**
 * Free-text search over majors, skills, companies, and clubs. On /browse it filters as
 * you type; elsewhere, Enter opens /browse with the query. ⌘K / Ctrl+K focuses it.
 */
export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const input = useRef<HTMLInputElement>(null);

  const onBrowse = pathname === "/browse";
  const urlQuery = onBrowse ? (searchParams.get("q") ?? "") : "";
  const [query, setQuery] = useState(urlQuery);

  // Follow the URL when it changes elsewhere (e.g. "Clear all").
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  // Live filtering on /browse, debounced so each keystroke doesn't trigger a render.
  useEffect(() => {
    if (!onBrowse || query.trim() === urlQuery) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("r");
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      router.replace(`/browse?${params}`, { scroll: false });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [onBrowse, query, router, searchParams, urlQuery]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      role="search"
      className={styles.search}
      onSubmit={(event) => {
        event.preventDefault();
        if (!onBrowse) router.push(query.trim() ? `/browse?q=${encodeURIComponent(query.trim())}` : "/browse");
      }}
    >
      <Search size={18} strokeWidth={2.75} className={styles.icon} aria-hidden />
      <input
        ref={input}
        type="search"
        name="q"
        autoComplete="off"
        className={styles.input}
        placeholder="Search skills, majors, companies…"
        aria-label="Search resumes"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <kbd className={styles.kbd} aria-hidden>
        ⌘K
      </kbd>
    </form>
  );
}
