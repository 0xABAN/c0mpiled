import { ResumeCard } from "@/frontend/features/resumes/resume-card";

import { EXAMPLE_RESUMES } from "./example-resumes";
import styles from "./card-stack.module.css";

/** Three example resume cards fanned out, with a sticker. Decorative, so it's inert. */
export function CardStack({ sticker }: { sticker: string }) {
  return (
    <div className={styles.stack} aria-hidden inert>
      {EXAMPLE_RESUMES.map((resume, index) => (
        <div key={resume.id} className={styles.card} data-index={index}>
          <ResumeCard resume={resume} href="#" />
        </div>
      ))}
      <span className={styles.sticker}>{sticker}</span>
    </div>
  );
}
