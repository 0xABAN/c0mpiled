"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/frontend/components/ui/button";
import { pluralize } from "@/frontend/lib/format";

import styles from "./filter-sheet.module.css";

type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Live result count for the close button, so users see the effect of each filter. */
  total: number;
  pending: boolean;
  children: ReactNode;
};

/** Bottom sheet that holds the filter rail on narrow screens. */
export function FilterSheet({ open, onClose, total, pending, children }: FilterSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog ref={dialog} className={styles.sheet} aria-label="Filters" onClose={onClose}>
      <div className={styles.header}>
        <Button variant="quiet" size="sm" icon aria-label="Close filters" onClick={onClose}>
          <X size={18} strokeWidth={3} />
        </Button>
      </div>

      <div className={styles.body}>{children}</div>

      <div className={styles.footer}>
        <Button variant="secondary" block loading={pending} onClick={onClose}>
          Show {pluralize(total, "resume")}
        </Button>
      </div>
    </dialog>
  );
}
