"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

import styles from "./masonry.module.css";

type MasonryProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  /** Rough rendered height, used to balance columns without measuring the DOM. */
  estimateHeight: (item: T) => number;
  renderItem: (item: T, index: number) => ReactNode;
  /** Narrowest a column may get before the layout drops a column. */
  minColumnWidth?: number;
  maxColumns?: number;
  gap?: number;
};

/**
 * Pinterest-style columns. Each item goes into the currently shortest column, in order,
 * so reading order stays roughly left-to-right and appended pages never move earlier items.
 */
export function Masonry<T>({ items, getKey, estimateHeight, renderItem, minColumnWidth = 260, maxColumns = 4, gap = 20 }: MasonryProps<T>) {
  const container = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(3);

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const fit = Math.floor((entry.contentRect.width + gap) / (minColumnWidth + gap));
      setColumnCount(Math.max(1, Math.min(maxColumns, fit)));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [gap, maxColumns, minColumnWidth]);

  const columns = useMemo(() => {
    const placed: { item: T; index: number }[][] = Array.from({ length: columnCount }, () => []);
    const heights = new Array<number>(columnCount).fill(0);

    items.forEach((item, index) => {
      const shortest = heights.indexOf(Math.min(...heights));
      placed[shortest].push({ item, index });
      heights[shortest] += estimateHeight(item) + gap;
    });

    return placed;
  }, [columnCount, estimateHeight, gap, items]);

  return (
    <div ref={container} className={styles.masonry} style={{ gap }}>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className={styles.column} style={{ gap }}>
          {column.map(({ item, index }) => (
            <div key={getKey(item)} className={styles.item} style={{ animationDelay: `${Math.min(index % 24, 12) * 30}ms` }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
