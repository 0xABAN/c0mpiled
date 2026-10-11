"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";

import { Button } from "@/frontend/components/ui/button";
import { RemovableChip } from "@/frontend/components/ui/chip";
import type { ResumeFacets, ResumeFilters, ResumeSort } from "@/frontend/lib/api/types";
import { pluralize } from "@/frontend/lib/format";

import styles from "./browse-toolbar.module.css";

type BrowseToolbarProps = {
  filters: ResumeFilters;
  facets: ResumeFacets;
  total: number;
  unlockedCount: number;
  canUnlock: boolean;
  pending: boolean;
  onChange: (next: ResumeFilters) => void;
};

const SORT_LABELS: Record<ResumeSort, string> = {
  "grad-year": "Graduating soonest",
  newest: "Newest",
};

/** Result count, sort, the recruiter's All/Unlocked switch, and removable applied filters. */
export function BrowseToolbar({ filters, facets, total, unlockedCount, canUnlock, pending, onChange }: BrowseToolbarProps) {
  const sortId = useId();
  const applied = appliedFilters(filters, facets, onChange);

  return (
    <div className={styles.toolbar}>
      {canUnlock && (
        <div className={styles.viewSwitch} role="group" aria-label="Resume view">
          <Button
            className={styles.viewButton}
            variant={filters.unlockedOnly ? "outline" : "primary"}
            aria-pressed={!filters.unlockedOnly}
            onClick={() => onChange({ ...filters, unlockedOnly: false })}
          >
            All resumes
          </Button>
          <Button
            className={styles.viewButton}
            variant={filters.unlockedOnly ? "primary" : "outline"}
            aria-pressed={filters.unlockedOnly}
            onClick={() => onChange({ ...filters, unlockedOnly: true })}
          >
            Unlocked <span className={styles.viewCount}>{unlockedCount}</span>
          </Button>
        </div>
      )}

      <div className={styles.row}>
        <p className={styles.count} aria-live="polite">
          {pending ? "Updating resumes…" : (
            <>
              <strong className="tabular">{pluralize(total, "resume")}</strong>
              {filters.q && <> for “{filters.q}”</>}
            </>
          )}
        </p>

        <div className={styles.controls}>
          <label htmlFor={sortId} className={styles.sortLabel}>
            Sort by
          </label>
          <div className={styles.sort}>
            <select id={sortId} value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as ResumeSort })}>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown size={18} strokeWidth={2.75} aria-hidden />
          </div>
        </div>
      </div>

      {applied.length > 0 && (
        <ul className={styles.applied} aria-label="Applied filters">
          {applied.map((chip) => (
            <li key={chip.key}>
              <RemovableChip onRemove={chip.remove} removeLabel={`Remove filter ${chip.label}`}>
                {chip.label}
              </RemovableChip>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One removable chip per applied value, labeled the way the rail labels it. */
function appliedFilters(filters: ResumeFilters, facets: ResumeFacets, onChange: (next: ResumeFilters) => void) {
  const labelOf = (options: { value: string; label: string }[], value: string) => options.find((option) => option.value === value)?.label ?? value;
  const without = <K extends keyof ResumeFilters>(key: K, value: unknown) => () =>
    onChange({ ...filters, [key]: (filters[key] as unknown[]).filter((item) => item !== value) });

  return [
    ...filters.seeking.map((value) => ({ key: `seeking:${value}`, label: labelOf(facets.seeking, value), remove: without("seeking", value) })),
    ...filters.gradYears.map((value) => ({ key: `year:${value}`, label: `Class of ${value}`, remove: without("gradYears", value) })),
    ...filters.majors.map((value) => ({ key: `major:${value}`, label: value, remove: without("majors", value) })),
    ...filters.skills.map((value) => ({ key: `skill:${value}`, label: value, remove: without("skills", value) })),
    ...filters.clubs.map((value) => ({ key: `club:${value}`, label: labelOf(facets.clubs, value), remove: without("clubs", value) })),
    ...filters.schools.map((value) => ({ key: `school:${value}`, label: value, remove: without("schools", value) })),
  ];
}
