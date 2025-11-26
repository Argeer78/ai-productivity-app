// app/tasks/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks – Lightweight todo list with progress | AI Productivity Hub",
  description:
    "Keep a simple, focused task list with due dates, categories and completion history. Perfect for daily execution without overwhelm.",
};

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
