// app/feedback/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback – Help shape AI Productivity Hub",
  description:
    "Send feedback, feature ideas and bug reports so we can improve the AI Productivity Hub for you.",
};

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
