// app/auth/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in / Sign up – AI Productivity Hub",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
