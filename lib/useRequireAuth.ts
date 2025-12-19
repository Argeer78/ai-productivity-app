// lib/useRequireAuth.ts
"use client";

import { useAuthGate } from "@/app/hooks/useAuthGate";

type OpenOptions = {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  secondaryLabel?: string;
  footerHint?: string;
};

export function useRequireAuth(user: any) {
  const gate = useAuthGate(user);

  // Backward-compatible: old code calls `open()` to show auth UI
  function open(opts?: OpenOptions) {
    gate.openGate(opts);
  }

  // Preferred: guard actions; returns true if authed, otherwise opens modal + false
  function requireAuth(opts?: OpenOptions) {
    return gate.requireAuth(undefined, opts);
  }

  return {
    open,
    requireAuth,

    // expose the gate so pages can mount <AuthGateModal ... />
    gate,
  };
}
