import { Check, X } from "lucide-react";

import { Button } from "@/frontend/components/ui/button";
import { Chip } from "@/frontend/components/ui/chip";
import { Monogram } from "@/frontend/components/ui/monogram";
import { Tag } from "@/frontend/components/ui/tag";
import type { Membership } from "@/frontend/lib/api/types";
import { formatDegree, timeAgo } from "@/frontend/lib/format";
import { seekingHue, seekingLabel } from "@/frontend/lib/hue";

import styles from "./membership-rows.module.css";

function Identity({ membership }: { membership: Membership }) {
  const { profile } = membership;

  return (
    <div className={styles.identity}>
      <Monogram name={membership.name} size={44} shape="circle" />
      <div className={styles.text}>
        <p className={styles.name}>{membership.name}</p>
        <p className={styles.email}>{membership.email}</p>
        <p className={styles.meta}>
          {formatDegree(profile.degree)} {profile.majors.join(" & ")} · Class of {profile.gradYear}
        </p>
      </div>
    </div>
  );
}

/** A pending request, shown unredacted so the officer can confirm it's a real member. */
export function RequestRow({ membership, busy, onAccept, onReject }: { membership: Membership; busy: boolean; onAccept: () => void; onReject: () => void }) {
  const { profile } = membership;

  return (
    <li className={`${styles.row} ${styles.request}`}>
      <Identity membership={membership} />

      <div className={styles.details}>
        <Tag hue={seekingHue(profile.seeking)}>{seekingLabel(profile.seeking)}</Tag>
        {profile.skills.slice(0, 3).map((skill) => (
          <Chip key={skill} small>
            {skill}
          </Chip>
        ))}
        <span className={styles.when}>{timeAgo(membership.requestedAt)}</span>
      </div>

      <div className={styles.actions}>
        <Button variant="quiet" size="sm" disabled={busy} onClick={onReject} aria-label={`Decline ${membership.name}`}>
          <X size={16} strokeWidth={3} aria-hidden />
          Decline
        </Button>
        <Button variant="primary" size="sm" disabled={busy} onClick={onAccept} aria-label={`Accept ${membership.name}`}>
          <Check size={16} strokeWidth={3.5} aria-hidden />
          Accept
        </Button>
      </div>
    </li>
  );
}

/** An accepted member: compact, with when they joined. */
export function MemberRow({ membership }: { membership: Membership }) {
  return (
    <li className={styles.row}>
      <Identity membership={membership} />
      <span className={styles.when}>Joined {timeAgo(membership.requestedAt)}</span>
    </li>
  );
}
