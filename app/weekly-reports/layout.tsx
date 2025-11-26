// app/weekly-reports/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekly Reports – AI summaries of your week | AI Productivity Hub",
  description:
    "Get an AI-generated summary of your week, including wins, challenges and focus suggestions for the next week.",
};

export default function WeeklyReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
