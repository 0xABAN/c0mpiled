"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/frontend/components/ui/button";
import { useToast } from "@/frontend/components/ui/toast";
import { updateBookPrice } from "@/frontend/lib/api/actions";
import { formatMoney } from "@/frontend/lib/format";

import styles from "./side-cards.module.css";

const MIN_DOLLARS = 25;

/** The book's price, editable in place. */
export function PriceCard({ priceCents, memberCount }: { priceCents: number; memberCount: number }) {
  const router = useRouter();
  const toast = useToast();
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [dollars, setDollars] = useState(String(priceCents / 100));
  const [saving, setSaving] = useState(false);

  const valid = Number.isInteger(Number(dollars)) && Number(dollars) >= MIN_DOLLARS;
  const perMember = memberCount > 0 ? formatMoney(Math.round(priceCents / memberCount)) : null;

  async function save() {
    setSaving(true);
    const result = await updateBookPrice(Number(dollars) * 100);
    setSaving(false);

    if (result.status === "error") return toast(result.message);

    setEditing(false);
    toast("Price updated");
    router.refresh();
  }

  return (
    <section className={styles.card} aria-labelledby={`${inputId}-heading`}>
      <div className={styles.cardHeader}>
        <p id={`${inputId}-heading`} className="eyebrow">
          Book price
        </p>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDollars(String(priceCents / 100));
              setEditing(true);
            }}
          >
            <Pencil size={14} strokeWidth={3} aria-hidden />
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className={styles.priceEditor}>
          <label htmlFor={inputId} className="visually-hidden">
            Price in dollars
          </label>
          <div className={styles.priceInput}>
            <span aria-hidden>$</span>
            <input id={inputId} inputMode="numeric" autoFocus value={dollars} onChange={(event) => setDollars(event.target.value.replace(/\D/g, "").slice(0, 5))} />
          </div>
          <div className={styles.priceActions}>
            <Button variant="quiet" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" disabled={!valid} loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className={`${styles.total} ${styles.price} tabular`}>{formatMoney(priceCents)}</p>
          {perMember && <p className={styles.caption}>About {perMember} per member resume</p>}
        </>
      )}
    </section>
  );
}
