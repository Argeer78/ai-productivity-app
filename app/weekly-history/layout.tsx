// app/weekly-history/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekly History – See your progress over time | AI Productivity Hub",
  description:
    "Browse older weekly reports and see how your focus, habits and success scores evolve over time.",
};

export default function WeeklyHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
