// app/hooks/useAuthGate.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import { useDemo } from "@/app/context/DemoContext";

export type AuthGateCopy = {
  title?: string;
  subtitle?: string;
  cta?: string;
};

type Options<TUser> = {
  user?: TUser | null;
  defaultCopy?: AuthGateCopy;
};

type Return = {
  open: boolean;
  authHref: string;
  copy: AuthGateCopy;
  close: () => void;

  /**
   * Returns true if user exists; otherwise opens modal and returns false.
   * Optionally runs `onAuthed()` if already authed.
   */
  requireAuth: (onAuthed?: () => void, overrideCopy?: AuthGateCopy) => boolean;

  /** Handy for buttons/handlers */
  openGate: (overrideCopy?: AuthGateCopy) => void;
};

export function useAuthGate<TUser extends unknown>(
  arg?: TUser | null | Options<TUser>
): Return {
  // ✅ Accept both: useAuthGate(user) OR useAuthGate({ user, defaultCopy })
  const { user, defaultCopy } = useMemo<Options<TUser>>(() => {
    // if it's an object with "user" or "defaultCopy", treat as options
    if (
      arg &&
      typeof arg === "object" &&
      ("user" in (arg as any) || "defaultCopy" in (arg as any))
    ) {
      return {
        user: (arg as Options<TUser>).user ?? null,
        defaultCopy: (arg as Options<TUser>).defaultCopy,
      };
    }
    // otherwise treat as the user itself
    return { user: (arg as TUser) ?? null };
  }, [arg]);

  const { isDemoMode } = useDemo();

  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState<AuthGateCopy>(defaultCopy || {});

  const authHref = "/auth";

  const close = useCallback(() => setOpen(false), []);

  const openGate = useCallback(
    (overrideCopy?: AuthGateCopy) => {
      setCopy({ ...(defaultCopy || {}), ...(overrideCopy || {}) });
      setOpen(true);
    },
    [defaultCopy]
  );

  const requireAuth = useCallback(
    (onAuthed?: () => void, overrideCopy?: AuthGateCopy) => {
      if (user || isDemoMode) { // ✅ Allow if user OR demo mode
        onAuthed?.();
        return true;
      }
      openGate(overrideCopy);
      return false;
    },
    [openGate, user, isDemoMode]
  );

  return { open, authHref, copy, close, requireAuth, openGate };
}
