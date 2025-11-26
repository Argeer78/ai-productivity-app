// app/dashboard/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard – See your day at a glance | AI Productivity Hub",
  description:
    "View your notes, tasks, daily score and key focus areas in one simple dashboard. Start your day with a clear picture of what matters.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This is a SERVER component (no "use client")
  // It just wraps the dashboard page and provides metadata.
  return <>{children}</>;
}
