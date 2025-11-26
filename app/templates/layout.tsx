// app/templates/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Templates – Reusable prompts for focus & writing | AI Productivity Hub",
  description:
    "Use and reuse high-quality AI prompt templates for planning, studying, writing and personal growth. Send them to the AI assistant in one click.",
};

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
