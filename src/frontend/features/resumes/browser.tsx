"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type MouseEvent } from "react";

import { AnchorButton, Button, LinkButton } from "@/frontend/components/ui/button";
import { loadMoreResumes } from "@/frontend/lib/api/actions";
import { resumePdfUrl } from "@/frontend/lib/api/routes";
import type { ResumeFacets, ResumeFilters, ResumePage, ResumeView } from "@/frontend/lib/api/types";

import { BrowseEmpty } from "./browse-states";
import { BrowseToolbar } from "./browse-toolbar";
import styles from "./browser.module.css";
import { FilterRail } from "./filter-rail";
import { FilterSheet } from "./filter-sheet";
import { activeFilterCount, browseHref, EMPTY_FILTERS, filtersKey, SELECTED_PARAM, unlockHref } from "./filters";
import { ContactCard, LockedNote, UnlockCard } from "./resume-access";
import { ResumeCard } from "./resume-card";
import { ResumeDetail } from "./resume-detail";

type BrowserProps = {
  filters: ResumeFilters;
  facets: ResumeFacets;
  /** First page, rendered on the server. Later pages load as the user scrolls. */
  initialPage: ResumePage;
  /** How many resumes the recruiter has unlocked; shows the All / Unlocked switch when > 0. */
  unlockedCount: number;
  /** Companies buy books; students browse with every resume locked and no unlock actions. */
  canUnlock: boolean;
  /** The resume named in `?r=`, when it isn't on the first page (e.g. a shared link). */
  linkedResume: ResumeView | null;
};

export function Browser({ filters, facets, initialPage, unlockedCount, canUnlock, linkedResume }: BrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFiltering, startFiltering] = useTransition();

  const [pages, setPages] = useState({ key: filtersKey(filters), items: initialPage.items, nextCursor: initialPage.nextCursor });
  const [loadError, setLoadError] = useState(false);
  const loadingMore = useRef(false);

  // A new server render (new filters) replaces whatever was loaded by scrolling.
  useEffect(() => {
    setPages({ key: filtersKey(filters), items: initialPage.items, nextCursor: initialPage.nextCursor });
    setLoadError(false);
  }, [filters, initialPage]);

  const applyFilters = useCallback(
    (next: ResumeFilters) => startFiltering(() => router.replace(browseHref(next), { scroll: false })),
    [router],
  );

  const loadMore = useCallback(async () => {
    if (!pages.nextCursor || loadingMore.current) return;

    loadingMore.current = true;
    setLoadError(false);

    try {
      const page = await loadMoreResumes(filters, pages.nextCursor);
      setPages((current) => (current.key === filtersKey(filters) ? { ...current, items: [...current.items, ...page.items], nextCursor: page.nextCursor } : current));
    } catch {
      setLoadError(true);
    } finally {
      loadingMore.current = false;
    }
  }, [filters, pages.nextCursor]);

  /* ---------- Detail view, driven by ?r= ---------- */

  const selectedId = searchParams.get(SELECTED_PARAM);
  const openedInPlace = useRef(false);

  const selectedIndex = selectedId ? pages.items.findIndex((resume) => resume.id === selectedId) : -1;
  const selected = selectedIndex >= 0 ? pages.items[selectedIndex] : linkedResume?.id === selectedId ? linkedResume : null;

  function openResume(event: MouseEvent<HTMLAnchorElement>, id: string) {
    // Let modified clicks open a new tab as usual.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    event.preventDefault();
    openedInPlace.current = true;
    window.history.pushState(null, "", browseHref(filters, id));
  }

  function closeResume() {
    if (openedInPlace.current) {
      openedInPlace.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", browseHref(filters));
    }
  }

  // Stepping between resumes replaces the entry, so Back still closes the detail view.
  const step = (offset: number) => {
    const target = pages.items[selectedIndex + offset];
    return target ? () => window.history.replaceState(null, "", browseHref(filters, target.id)) : null;
  };

  // Prefetch the next page when the user steps near the end of what's loaded.
  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex >= pages.items.length - 3) void loadMore();
  }, [loadMore, pages.items.length, selectedIndex]);

  /* ---------- Infinite scroll ---------- */

  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !pages.nextCursor) return;

    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && void loadMore(), { rootMargin: "800px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMore, pages.nextCursor]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const filterCount = activeFilterCount(filters);

  return (
    <div className={styles.layout}>
      <aside className={styles.rail} aria-label="Filters">
        <FilterRail facets={facets} filters={filters} onChange={applyFilters} />
      </aside>

      <section className={styles.results} aria-label="Resumes" aria-busy={isFiltering}>
        <div className={styles.mobileFilters}>
          <Button variant="quiet" size="sm" onClick={() => setSheetOpen(true)}>
            <SlidersHorizontal size={16} strokeWidth={2.75} aria-hidden />
            Filters{filterCount > 0 && ` · ${filterCount}`}
          </Button>
        </div>

        <BrowseToolbar filters={filters} facets={facets} total={initialPage.total} unlockedCount={canUnlock ? unlockedCount : 0} onChange={applyFilters} />

        <div className={isFiltering ? `${styles.grid} ${styles.pending}` : styles.grid}>
          {pages.items.length > 0 ? (
            <div className={styles.cards}>
              {pages.items.map((resume) => (
                <ResumeCard key={resume.id} resume={resume} href={browseHref(filters, resume.id)} onOpen={(event) => openResume(event, resume.id)} />
              ))}
            </div>
          ) : (
            <BrowseEmpty hasFilters={filterCount > 0 || filters.q !== ""} onClear={() => applyFilters(EMPTY_FILTERS)} />
          )}
        </div>

        {pages.nextCursor && (
          <div ref={sentinel} className={styles.loadMore}>
            {loadError ? (
              <Button variant="outline" onClick={() => void loadMore()}>
                Couldn&apos;t load more. Try again
              </Button>
            ) : (
              <span className={styles.loading} aria-label="Loading more resumes" />
            )}
          </div>
        )}
      </section>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} total={initialPage.total} pending={isFiltering}>
        <FilterRail facets={facets} filters={filters} onChange={applyFilters} />
      </FilterSheet>

      {selected && (
        <ResumeDetail
          resume={selected}
          action={
            !canUnlock ? (
              <LockedNote resume={selected} />
            ) : selected.contact ? (
              <ContactCard resumeId={selected.id} email={selected.contact.email} />
            ) : (
              <UnlockCard resume={selected} href={unlockHref(filters, selected.id)} />
            )
          }
          mobileAction={
            !canUnlock ? undefined : selected.contact ? (
              <AnchorButton href={resumePdfUrl(selected.id, { download: true })} variant="primary" block>
                Download PDF
              </AnchorButton>
            ) : (
              <LinkButton href={unlockHref(filters, selected.id)} variant="primary" block>
                Unlock resume
              </LinkButton>
            )
          }
          position={selectedIndex >= 0 ? { index: selectedIndex, total: initialPage.total } : null}
          onPrevious={selectedIndex >= 0 ? step(-1) : null}
          onNext={selectedIndex >= 0 ? step(1) : null}
          onClose={closeResume}
        />
      )}
    </div>
  );
}
