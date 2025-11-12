"use client";
import { useEffect } from "react";
import { useAnalytics } from "@/app/lib/analytics";

export default function TrackUpgrade({ success }: { success: boolean }) {
  const { track } = useAnalytics();
  useEffect(() => {
    if (success) track("upgrade_pro");
  }, [success, track]);
  return null;
}
