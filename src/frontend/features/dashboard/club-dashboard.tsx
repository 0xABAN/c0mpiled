"use client";

import { Check, Clock, Copy, DollarSign, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/frontend/components/ui/button";
import { Monogram } from "@/frontend/components/ui/monogram";
import { useToast } from "@/frontend/components/ui/toast";
import { decideJoinRequest } from "@/frontend/lib/api/actions";
import type { ClubDashboard as Dashboard, Membership } from "@/frontend/lib/api/types";
import { formatMoney, pluralize } from "@/frontend/lib/format";

import styles from "./club-dashboard.module.css";
import { EarningsCard } from "./earnings-card";
import { MemberRow, RequestRow } from "./membership-rows";
import { PriceCard } from "./price-card";

/** An officer's view of their club: share the link, vet requests, watch sales. */
export function ClubDashboard({ dashboard }: { dashboard: Dashboard }) {
  const router = useRouter();
  const toast = useToast();
  const { club, book, joinUrl, unlocks, earnedCents } = dashboard;

  // Decisions apply instantly; the server refresh afterwards reconciles counts.
  const [memberships, setMemberships] = useState(dashboard.memberships);
  const [deciding, setDeciding] = useState<string | null>(null);

  const pending = memberships.filter((membership) => membership.status === "pending");
  const members = memberships.filter((membership) => membership.status === "accepted");

  async function decide(membership: Membership, decision: "accepted" | "rejected") {
    const before = memberships;
    setDeciding(membership.resumeId);
    setMemberships((current) =>
      decision === "rejected"
        ? current.filter((item) => item.resumeId !== membership.resumeId)
        : current.map((item) => (item.resumeId === membership.resumeId ? { ...item, status: "accepted" } : item)),
    );

    const result = await decideJoinRequest(membership.resumeId, decision);
    setDeciding(null);

    if (result.status === "error") {
      setMemberships(before);
      toast(result.message);
      return;
    }

    toast(decision === "accepted" ? `${membership.name.split(" ")[0]} is in` : "Request declined");
    router.refresh();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    toast("Join link copied");
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-hue={club.hue}>
        <Monogram name={club.name} hue={club.hue} size={76} />
        <div className={styles.heroText}>
          <h1 className={styles.clubName}>{club.name}</h1>
          <p className={styles.clubMeta}>{[club.tagline, club.school].filter(Boolean).join(" · ")}</p>
        </div>

        <div className={styles.share}>
          <p className={styles.shareLabel}>Member join link</p>
          <div className={styles.linkBox}>
            <code>{joinUrl}</code>
            <Button variant="secondary" size="sm" onClick={copyLink}>
              <Copy size={16} strokeWidth={3} aria-hidden />
              Copy
            </Button>
          </div>
        </div>
      </header>

      <dl className={styles.stats}>
        <Stat icon={<Users size={22} strokeWidth={2.75} />} hue="blue" label="Members" value={String(members.length)} />
        <Stat icon={<Clock size={22} strokeWidth={2.75} />} hue="yellow" label="Waiting for you" value={String(pending.length)} />
        <Stat icon={<DollarSign size={22} strokeWidth={2.75} />} hue="purple" label="Book price" value={formatMoney(book.priceCents)} />
        <Stat icon={<Check size={22} strokeWidth={3} />} hue="green" label="Earned" value={formatMoney(earnedCents)} />
      </dl>

      <div className={styles.columns}>
        <div className={styles.main}>
          <section aria-labelledby="requests-heading">
            <h2 id="requests-heading" className={styles.sectionTitle}>
              Requests {pending.length > 0 && <span className={styles.badge}>{pending.length}</span>}
            </h2>

            {pending.length > 0 ? (
              <ul className={styles.rows}>
                {pending.map((membership) => (
                  <RequestRow
                    key={membership.resumeId}
                    membership={membership}
                    busy={deciding === membership.resumeId}
                    onAccept={() => decide(membership, "accepted")}
                    onReject={() => decide(membership, "rejected")}
                  />
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No one is waiting. Share your join link to bring in more members.</p>
            )}
          </section>

          <section aria-labelledby="members-heading">
            <h2 id="members-heading" className={styles.sectionTitle}>
              Members <span className={styles.count}>{members.length}</span>
            </h2>

            {members.length > 0 ? (
              <ul className={styles.rows}>
                {members.map((membership) => (
                  <MemberRow key={membership.resumeId} membership={membership} />
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>Accepted members show up here, and in your book for companies.</p>
            )}
          </section>
        </div>

        <aside className={styles.side}>
          <EarningsCard unlocks={unlocks} earnedCents={earnedCents} />
          <PriceCard priceCents={book.priceCents} memberCount={members.length} />
          <p className={styles.sideNote}>Companies see {pluralize(members.length, "accepted member")} when they unlock your book.</p>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, hue, label, value }: { icon: ReactNode; hue: "blue" | "yellow" | "purple" | "green"; label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statIcon} data-hue={hue} aria-hidden>
        {icon}
      </span>
      {/* Label first for screen readers; CSS shows the value on top. */}
      <div className={styles.statText}>
        <dt className={styles.statLabel}>{label}</dt>
        <dd className={`${styles.statValue} tabular`}>{value}</dd>
      </div>
    </div>
  );
}
