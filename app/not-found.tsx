// app/not-found.tsx
"use client";

import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AppHeader />
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md">
          <p className="text-xs font-semibold text-indigo-300 mb-2">
            404 · Page not found
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            This page got lost in your to-do list.
          </h1>
          <p className="text-sm text-slate-300 mb-6">
            The link you followed doesn&apos;t exist. You can go back to your
            dashboard or explore the tools in AI Productivity Hub.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500"
            >
              Go to dashboard
            </Link>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-900"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
