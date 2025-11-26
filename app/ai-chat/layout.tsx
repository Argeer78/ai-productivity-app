// app/ai-chat/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Hub Chat – One place to talk with your AI assistant | AI Productivity Hub",
  description:
    "Chat with your AI assistant about notes, tasks, plans and ideas. Reuse templates and context from your workspace.",
};

export default function AiChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
