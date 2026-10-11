import type { CSSProperties, ReactNode } from "react";

import { Monogram } from "@/frontend/components/ui/monogram";
import type { ResumeView } from "@/frontend/lib/api/types";
import { formatDegree } from "@/frontend/lib/format";

import styles from "./redacted-resume.module.css";

type RedactedResumeProps = {
  resume: ResumeView;
  /** `card` is the grid thumbnail; `full` is the detail view. Every size inside scales with it. */
  size: "card" | "full";
  /** Play the un-redaction animation once (right after a purchase). */
  revealing?: boolean;
};

/**
 * A resume-shaped document drawn from the parsed profile. Name and contact details are
 * covered by redaction bars until the viewer unlocks the resume, and bullet text (which
 * we never send to the browser) is drawn as gray placeholder lines.
 *
 * Built from `profile` instead of the PDF, so nothing private reaches the client before unlock.
 */
export function RedactedResume({ resume, size, revealing }: RedactedResumeProps) {
  const { profile, contact, school } = resume;
  const bulletsPerJob = size === "card" ? 1 : 3;

  return (
    <article className={`${styles.paper} ${styles[size]}`} aria-label={contact ? `Resume of ${contact.name}` : "Redacted resume"}>
      <header className={styles.header}>
        <h3 className={styles.name}>
          {contact ? (
            <span className={revealing ? styles.revealing : undefined}>
              {contact.name}
              {revealing && <span className={styles.peel} aria-hidden />}
            </span>
          ) : (
            <Redaction width={58} label="Name hidden until unlocked" />
          )}
        </h3>

        <p className={styles.contactLine}>
          {contact ? (
            <span className={revealing ? styles.revealing : undefined}>
              {contact.email ?? "Email not listed"}
              {revealing && <span className={styles.peel} aria-hidden />}
            </span>
          ) : (
            <>
              <Redaction width={34} thin label="Email hidden" />
              <Redaction width={22} thin label="Phone hidden" />
              <Redaction width={18} thin label="Links hidden" />
            </>
          )}
        </p>
      </header>

      {/* Cards already show school, major, and year below the paper. */}
      {size === "full" && (
        <Section title="Education">
          <div className={styles.entry}>
            <Monogram name={school.name} hue="blue" size={24} />
            <div className={styles.entryText}>
              <p className={styles.entryTitle}>{school.name}</p>
              <p className={styles.entryMeta}>
                {formatDegree(profile.degree)}, {profile.majors.join(" & ")} · {profile.gradYear}
              </p>
            </div>
          </div>
        </Section>
      )}

      {profile.experience.length > 0 && (
        <Section title="Experience">
          {profile.experience.map((job, index) => (
            <div key={`${job.org}-${index}`} className={styles.entry}>
              <Monogram name={job.org} size={size === "card" ? 16 : 24} />
              <div className={styles.entryText}>
                <p className={styles.entryTitle}>{job.org}</p>
                <p className={styles.entryMeta}>{job.title}</p>
                <Placeholder seed={`${resume.id}:${index}`} lines={bulletsPerJob} />
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

/** Gray lines where bullet text would be. Widths come from `seed`, so they're stable per resume. */
function Placeholder({ seed, lines }: { seed: string; lines: number }) {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;

  const widths = Array.from({ length: lines }, (_, index) => 62 + ((hash >> (index * 5)) % 34));

  return (
    <span className={styles.placeholder} aria-hidden>
      {widths.map((width, index) => (
        <span key={index} style={{ width: `${width}%` }} />
      ))}
    </span>
  );
}
