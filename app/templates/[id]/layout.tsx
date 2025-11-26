// app/templates/[id]/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Template details – Edit & reuse your AI prompts | AI Productivity Hub",
  description:
    "View and edit a single AI template. Refine the prompt, update the description, and reuse it with the AI assistant anytime.",
};

export default function TemplateDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
