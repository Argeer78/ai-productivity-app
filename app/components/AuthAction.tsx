"use client";

import type { ReactNode } from "react";
import type { AuthGateCopy } from "@/app/hooks/useAuthGate";

type RequireAuthFn = (action?: () => void, overrideCopy?: AuthGateCopy) => boolean;

type Props = {
  requireAuth: RequireAuthFn;

  /** What happens when user IS logged in */
  action?: () => void;

  /** Optional: customize modal copy per action */
  gateCopy?: AuthGateCopy;

  /** Render any clickable UI */
  children: ReactNode;

  /** Optional: render as <a> / <button> / etc */
  as?: "button" | "a" | "div" | "span";

  /** Passed through */
  href?: string; // for <a>
  type?: "button" | "submit"; // for <button>
  className?: string;
  disabled?: boolean;
  title?: string;

  /** If true, allow click even when not authed (won’t gate) */
  bypass?: boolean;
};

export default function AuthAction({
  requireAuth,
  action,
  gateCopy,
  children,
  as = "button",
  href,
  type = "button",
  className,
  disabled,
  title,
  bypass = false,
}: Props) {
  const common = {
    className,
    title,
    "aria-disabled": disabled ? true : undefined,
  } as const;

  function onClick(e: any) {
    if (disabled) {
      e?.preventDefault?.();
      return;
    }

    if (bypass) {
      action?.();
      return;
    }

    const ok = requireAuth(action, gateCopy);

    // If it's a link and auth is required, prevent navigation.
    if (!ok) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
    }
  }

  if (as === "a") {
    return (
      <a href={href} onClick={onClick} {...common}>
        {children}
      </a>
    );
  }

  if (as === "div") {
    return (
      <div role="button" tabIndex={0} onClick={onClick} {...common}>
        {children}
      </div>
    );
  }

  if (as === "span") {
    return (
      <span role="button" tabIndex={0} onClick={onClick} {...common}>
        {children}
      </span>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} {...common}>
      {children}
    </button>
  );
}
