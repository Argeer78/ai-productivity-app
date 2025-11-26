// app/planner/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily & Weekly Planner – Plan realistic days | AI Productivity Hub",
  description:
    "Plan your day or week with time blocks, priorities and AI support. Create realistic plans that match your actual energy and schedule.",
};

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
