"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

async function loadAdminCapability(session: Session | null): Promise<boolean> {
  if (!session?.access_token) return false;

  const response = await fetch("/api/auth/capabilities", {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });

  if (!response.ok) return false;
  const result = (await response.json()) as { admin?: boolean };
  return result.admin === true;
}

export function useAdminCapability() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function update(session: Session | null) {
      try {
        const admin = await loadAdminCapability(session);
        if (active) setIsAdmin(admin);
      } catch {
        if (active) setIsAdmin(false);
      } finally {
        if (active) setLoading(false);
      }
    }

    void supabase.auth.getSession().then(({ data }) => update(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      void update(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
}