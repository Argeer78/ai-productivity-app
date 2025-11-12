"use client";

import { usePlausible } from "next-plausible";

export type AnalyticEvent =
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "upgrade_pro"
  | "manage_subscription_opened"
  | "ai_call_used"
  | "note_created"
  | "task_created"
  | "feedback_submitted"
  | "share_clicked";

export function useAnalytics() {
  const plausible = usePlausible<AnalyticEvent>();
  return {
    track: (name: AnalyticEvent, props?: Record<string, any>) =>
      plausible(name, { props }),
  };
}
