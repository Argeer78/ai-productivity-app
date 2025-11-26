// app/changelog/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog – What’s new in AI Productivity Hub",
  description:
    "Read about the latest improvements, features and tweaks shipped to AI Productivity Hub.",
};

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
