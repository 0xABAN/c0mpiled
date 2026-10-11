import type { CSSProperties, ReactNode } from "react";

import { Monogram } from "@/frontend/components/ui/monogram";
import type { ResumeView } from "@/frontend/lib/api/types";

import styles from "./redacted-resume.module.css";

/**
 * A compact, stylized thumbnail drawn from the profile, never the full-size document.
 * Expanded views use the actual redacted pages so bullets, dates, and layout are preserved.
 */
export function RedactedResume({ resume }: { resume: ResumeView }) {
  const { profile, contact } = resume;

  return (
    <article className={styles.paper} aria-label={contact ? `Resume of ${contact.name}` : "Redacted resume"}>
      <header className={styles.header}>
        <h3 className={styles.name}>
          {contact ? contact.name : <Redaction width={58} label="Name hidden until unlocked" />}
        </h3>

        <p className={styles.contactLine}>
          {contact ? (
            contact.email ?? "Email not listed"
          ) : (
            <>
              <Redaction width={34} thin label="Email hidden" />
              <Redaction width={22} thin label="Phone hidden" />
              <Redaction width={18} thin label="Links hidden" />
            </>
          )}
        </p>
      </header>

      {profile.experience.length > 0 && (
        <Section title="Experience">
          {profile.experience.map((job, index) => (
            <div key={`${job.org}-${index}`} className={styles.entry}>
              <Monogram name={job.org} size={16} />
              <div className={styles.entryText}>
                <p className={styles.entryTitle}>{job.org}</p>
                <p className={styles.entryMeta}>{job.title}</p>
                <Placeholder seed={`${resume.id}:${index}`} />
              </div>
            </div>
          ))}
        </Section>
      )}

      {profile.skills.length > 0 && (
        <Section title="Skills">
          <p className={styles.skills}>{profile.skills.join(" · ")}</p>
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>{title}</h4>
      {children}
    </section>
  );
}

/** A solid bar standing in for hidden text. `width` is a percentage of the line. */
function Redaction({ width, thin, label }: { width: number; thin?: boolean; label: string }) {
  return (
    <span
      className={`${styles.redaction} ${thin ? styles.thin : ""}`}
      style={{ "--w": `${width}%` } as CSSProperties}
      role="img"
      aria-label={label}
    />
  );
}

/** A gray hint of bullet text. Its width stays stable for each thumbnail. */
function Placeholder({ seed }: { seed: string }) {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;

  return (
    <span className={styles.placeholder} aria-hidden>
      <span style={{ width: `${62 + (hash % 34)}%` }} />
    </span>
  );
}
