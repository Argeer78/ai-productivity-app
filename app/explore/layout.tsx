// app/explore/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore – Ideas, experiments & new features | AI Productivity Hub",
  description:
    "Discover experimental tools, prompts and workflows built on top of the AI Productivity Hub.",
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
