"use client";

import { CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

import styles from "./toast.module.css";

type ToastContextValue = (message: string) => void;

const ToastContext = createContext<ToastContextValue | null>(null);

/** Hosts one short-lived confirmation at a time ("Link copied"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((next: string) => {
    clearTimeout(timer.current);
    setMessage(next);
    setKey((previous) => previous + 1); // restart the entrance animation for repeat toasts
    timer.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {message && (
          <div key={key} className={styles.toast}>
            <CircleCheck size={20} strokeWidth={2.75} aria-hidden />
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>.");
  return show;
}
