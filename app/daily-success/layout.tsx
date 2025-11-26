// app/daily-success/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Success Score – Track how the day really felt | AI Productivity Hub",
  description:
    "Give each day a simple success score and short reflection. See patterns over time and focus on what actually moves your life forward.",
};

export default function DailySuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
