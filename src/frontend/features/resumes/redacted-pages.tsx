"use client";

import { useState } from "react";

import styles from "./redacted-pages.module.css";

type RedactedPagesProps = {
  /** Image sources, one per page: preview URLs on browse, data URLs during review. */
  pages: string[];
  label: string;
};

/**
 * The student's real resume, rendered server-side with every identifying detail blacked
 * out (Contract 3). Pages are images, so nothing hidden survives in a text layer.
 */
export function RedactedPages({ pages, label }: RedactedPagesProps) {
  return (
    <div className={styles.pages} role="group" aria-label={label}>
      {pages.map((src, index) => (
        <Page key={src} src={src} alt={`${label}, page ${index + 1} of ${pages.length}`} />
      ))}
    </div>
  );
}

function Page({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={loaded ? styles.page : `${styles.page} ${styles.loading}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- presigned redirects and data URLs, not optimizable assets */}
      <img src={src} alt={alt} className={styles.image} onLoad={() => setLoaded(true)} />
    </div>
  );
}
