// app/settings/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings – Profile, plan & preferences | AI Productivity Hub",
  description:
    "Manage your account, AI preferences, language, email digests and billing settings in one place.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
