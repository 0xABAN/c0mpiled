import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "premium" | "danger" | "outline" | "quiet" | "inverse" | "ghost";

type CommonProps = {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  /** Stretch to the container width. */
  block?: boolean;
  /** Square icon-only button. Pass an `aria-label`. */
  icon?: boolean;
  children: ReactNode;
};

type ButtonProps = CommonProps &
  Omit<ComponentProps<"button">, "children"> & {
    /** Show a spinner and block clicks while an action is running. */
    loading?: boolean;
  };
type LinkButtonProps = CommonProps & Omit<ComponentProps<typeof Link>, "children">;
type AnchorButtonProps = CommonProps & Omit<ComponentProps<"a">, "children">;

function classNames({ variant = "primary", size = "md", block, icon }: CommonProps, extra?: string) {
  return [styles.button, styles[variant], size !== "md" && styles[size], block && styles.block, icon && styles.icon, extra]
    .filter(Boolean)
    .join(" ");
}

export function Button({ variant, size, block, icon, loading, children, className, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={classNames({ variant, size, block, icon, children }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : children}
    </button>
  );
}

/** A link styled as a button, for navigation actions. */
export function LinkButton({ variant, size, block, icon, children, className, ...rest }: LinkButtonProps) {
  return (
    <Link className={classNames({ variant, size, block, icon, children }, className)} {...rest}>
      {children}
    </Link>
  );
}

/** A plain anchor styled as a button, for downloads and files served by API routes. */
export function AnchorButton({ variant, size, block, icon, children, className, ...rest }: AnchorButtonProps) {
  return (
    <a className={classNames({ variant, size, block, icon, children }, className)} {...rest}>
      {children}
    </a>
  );
}
