"use client";

import { ChevronDown, Search } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/frontend/components/ui/button";
import { ToggleChip } from "@/frontend/components/ui/chip";
import { Checkbox } from "@/frontend/components/ui/field";
import { Monogram } from "@/frontend/components/ui/monogram";
import type { FacetOption, ResumeFacets, ResumeFilters, Seeking } from "@/frontend/lib/api/types";

import { activeFilterCount, EMPTY_FILTERS, toggle } from "./filters";
import styles from "./filter-rail.module.css";

type FilterRailProps = {
  facets: ResumeFacets;
  filters: ResumeFilters;
  onChange: (next: ResumeFilters) => void;
};

/** Left-hand filters for browse. Every change is applied immediately. */
export function FilterRail({ facets, filters, onChange }: FilterRailProps) {
  const set = <K extends keyof ResumeFilters>(key: K, value: ResumeFilters[K]) => onChange({ ...filters, [key]: value });

  return (
    <div className={styles.rail}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Filters</h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={activeFilterCount(filters) === 0}
          onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q, sort: filters.sort })}
        >
          Clear all
        </Button>
      </div>

      <Section title="Looking for">
        <div className={styles.chips}>
          {facets.seeking.map((option) => (
            <ToggleChip
              key={option.value}
              pressed={filters.seeking.includes(option.value as Seeking)}
              onClick={() => set("seeking", toggle(filters.seeking, option.value as Seeking))}
            >
              {option.label}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Graduating">
        <div className={styles.chips}>
          {facets.gradYears.map((option) => (
            <ToggleChip
              key={option.value}
              pressed={filters.gradYears.includes(Number(option.value))}
              onClick={() => set("gradYears", toggle(filters.gradYears, Number(option.value)))}
              aria-label={`Class of ${option.value}, ${option.count} resumes`}
            >
              {option.value}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Major">
        <FacetList options={facets.majors} selected={filters.majors} onToggle={(value) => set("majors", toggle(filters.majors, value))} searchLabel="Search majors" />
      </Section>

      <Section title="Skills" hint="Must have all">
        <FacetList options={facets.skills} selected={filters.skills} onToggle={(value) => set("skills", toggle(filters.skills, value))} searchLabel="Search skills" visible={8} />
      </Section>

      <Section title="Club">
        <FacetList
          options={facets.clubs}
          selected={filters.clubs}
          onToggle={(value) => set("clubs", toggle(filters.clubs, value))}
          searchLabel="Search clubs"
          renderLabel={(option) => (
            <span className={styles.clubOption}>
              <Monogram name={option.label} hue={option.hue} size={22} />
              {option.label}
            </span>
          )}
        />
      </Section>

      {facets.schools.length > 1 && (
        <Section title="School">
          <FacetList options={facets.schools} selected={filters.schools} onToggle={(value) => set("schools", toggle(filters.schools, value))} searchLabel="Search schools" />
        </Section>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <details className={styles.section} open>
      <summary className={styles.summary}>
        <span className={styles.sectionTitle}>
          {title}
          {hint && <span className={styles.hint}>{hint}</span>}
        </span>
        <ChevronDown className={styles.chevron} size={20} strokeWidth={2.75} aria-hidden />
      </summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
  );
}

type FacetListProps<O extends FacetOption> = {
  options: O[];
  selected: string[];
  onToggle: (value: string) => void;
  searchLabel: string;
  /** How many options show before "Show all". Selected options always show. */
  visible?: number;
  renderLabel?: (option: O) => ReactNode;
};

/** Checkbox list with counts, an inline search when long, and a "show all" toggle. */
function FacetList<O extends FacetOption>({ options, selected, onToggle, searchLabel, visible = 6, renderLabel }: FacetListProps<O>) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const searchId = useId();

  const needle = query.trim().toLowerCase();
  const matching = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;

  // Keep selected options visible even when collapsed, so a choice never disappears.
  const shown = expanded || needle ? matching : matching.filter((option, index) => index < visible || selected.includes(option.value));
  const hiddenCount = matching.length - shown.length;

  return (
    <div className={styles.facet}>
      {options.length > visible && (
        <div className={styles.search}>
          <label htmlFor={searchId} className="visually-hidden">
            {searchLabel}
          </label>
          <Search size={16} strokeWidth={2.75} className={styles.searchIcon} aria-hidden />
          <input id={searchId} className={styles.searchInput} placeholder={searchLabel} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      )}

      <ul className={styles.options}>
        {shown.map((option) => (
          <li key={option.value}>
            <Checkbox checked={selected.includes(option.value)} onChange={() => onToggle(option.value)} count={option.count}>
              {renderLabel ? renderLabel(option) : option.label}
            </Checkbox>
          </li>
        ))}
        {shown.length === 0 && <li className={styles.empty}>No matches for “{query}”</li>}
      </ul>

      {!needle && (hiddenCount > 0 || expanded) && (
        <Button variant="ghost" size="sm" className={styles.more} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer" : `Show all ${matching.length}`}
        </Button>
      )}
    </div>
  );
}
