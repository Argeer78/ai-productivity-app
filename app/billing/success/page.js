"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Processing your upgrade...");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("Missing session ID.");
      return;
    }

    async function confirm() {
      try {
        const res = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (data.success) {
          setStatus("Your account is now Pro! Redirecting to notes...");
          setTimeout(() => {
            router.push("/notes");
          }, 1500);
        } else {
          setStatus("Error upgrading account.");
        }
      } catch (err) {
        console.error(err);
        setStatus("Error contacting server.");
      }
    }

    confirm();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="max-w-md w-full border border-slate-800 rounded-2xl p-6 bg-slate-900/70 text-center">
        <h1 className="text-2xl font-bold mb-3">Payment successful ✅</h1>
        <p className="text-sm text-slate-300">{status}</p>
      </div>
    </main>
  );
}
