// app/weekly-reports/[id]/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekly Report details – Look back on a single week | AI Productivity Hub",
  description:
    "Open a single AI-generated weekly report to review your wins, challenges and next-step suggestions.",
};

export default function WeeklyReportDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
