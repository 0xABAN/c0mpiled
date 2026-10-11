"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Monogram } from "@/frontend/components/ui/monogram";
import { SelectionCard } from "@/frontend/components/ui/selection-card";
import { searchSchools } from "@/frontend/lib/api/actions";
import type { School } from "@/frontend/lib/api/types";

import styles from "./school-picker.module.css";

const DEBOUNCE_MS = 200;

type SchoolPickerProps = {
  selected: School | null;
  onSelect: (school: School) => void;
};

/** Typeahead over US universities. Results are radio cards, so the choice is explicit. */
export function SchoolPicker({ selected, onSelect }: SchoolPickerProps) {
  const inputId = useId();
  const [query, setQuery] = useState(selected?.name ?? "");
  const [results, setResults] = useState<School[]>(selected ? [selected] : []);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const needle = query.trim();
    if (!needle) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(async () => {
      const found = await searchSchools(needle);
      if (!cancelled) {
        setResults(found);
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const showEmpty = query.trim() !== "" && !searching && results.length === 0;

  return (
    <div className={styles.picker}>
      <div className={styles.search}>
        <label htmlFor={inputId} className="visually-hidden">
          School name
        </label>
        <Search size={22} strokeWidth={2.75} className={styles.icon} aria-hidden />
        <input
          id={inputId}
          className={styles.input}
          placeholder="Start typing your school"
          autoComplete="off"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className={styles.results} role="radiogroup" aria-label="Schools" aria-busy={searching}>
        {results.map((school) => (
          <SelectionCard
            key={school.domains[0]}
            type="radio"
            name="school"
            value={school.domains[0]}
            checked={selected?.domains[0] === school.domains[0]}
            onChange={() => onSelect(school)}
            art={<Monogram name={school.name} size={44} />}
            title={school.name}
            description={`@${school.domains[0]}`}
          />
        ))}

        {showEmpty && <p className={styles.empty}>No schools match “{query}”. Try its full name.</p>}
      </div>
    </div>
  );
}
