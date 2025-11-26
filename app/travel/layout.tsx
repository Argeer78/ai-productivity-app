// app/travel/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Travel Planner – Trips, itineraries & booking handoff | AI Productivity Hub",
  description:
    "Use AI to plan trips, get day-by-day itineraries and send details straight to Booking.com. Simple planning for real travel.",
};

export default function TravelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
