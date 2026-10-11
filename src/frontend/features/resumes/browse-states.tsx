import { SearchX } from "lucide-react";

import { Button } from "@/frontend/components/ui/button";

import styles from "./browse-states.module.css";

/** Shown when the current filters match nothing. */
export function BrowseEmpty({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon} aria-hidden>
        <SearchX size={34} strokeWidth={2.5} />
      </span>
      <h2 className={styles.emptyTitle}>{hasFilters ? "No resumes match those filters" : "No resumes yet"}</h2>
      <p className={styles.emptyBody}>
        {hasFilters ? "Try removing a skill or widening the graduation years." : "Clubs are adding their books. Check back soon."}
      </p>
      {hasFilters && (
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
