// app/my-trips/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Trips – Save and revisit your travel plans | AI Productivity Hub",
  description:
    "See all your saved trips and itineraries in one place. Reopen, tweak or reuse previous AI-generated trip plans.",
};

export default function MyTripsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
