"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/frontend/components/ui/button";

const ARMED_MS = 3500;

type ConfirmButtonProps = {
  label: string;
  /** Shown after the first click; a second click within a few seconds runs the action. */
  confirmLabel: string;
  icon?: ReactNode;
  onConfirm: () => Promise<unknown>;
};

/** A destructive action that needs two clicks, without a modal. */
export function ConfirmButton({ label, confirmLabel, icon, onConfirm }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const [running, setRunning] = useState(false);

  // Disarm on its own so a stray click later doesn't delete anything.
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), ARMED_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  async function click() {
    if (!armed) return setArmed(true);

    setRunning(true);
    await onConfirm();
    setRunning(false);
    setArmed(false);
  }

  return (
    <Button variant={armed ? "danger" : "quiet"} size="sm" loading={running} onClick={click} aria-live="polite">
      {icon}
      {armed ? confirmLabel : label}
    </Button>
  );
}
