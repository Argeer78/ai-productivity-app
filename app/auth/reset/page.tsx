// app/auth/reset/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // On load, check if Supabase has a valid recovery session from the email link
  useEffect(() => {
    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("[reset] getUser error", error);
          setHasValidSession(false);
        } else if (data?.user) {
          setHasValidSession(true);
        } else {
          setHasValidSession(false);
        }
      } catch (err) {
        console.error("[reset] unexpected error", err);
        setHasValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error("[reset] updateUser error", error);
        setError(error.message || "Failed to update password.");
        return;
      }

      setMessage("Password updated. Redirecting to login…");
      setTimeout(() => {
        router.push("/auth");
      }, 1500);
    } catch (err: any) {
      console.error("[reset] updateUser exception", err);
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <p className="text-sm text-slate-300">Checking reset link…</p>
      </main>
    );
  }

  if (!hasValidSession) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
        <h1 className="text-2xl font-bold mb-2">Reset link invalid</h1>
        <p className="text-sm text-slate-300 mb-4 text-center max-w-sm">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link
          href="/auth"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm"
        >
          Back to login
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md border border-slate-800 rounded-2xl p-6 bg-slate-900/70 shadow-lg">
        <h1 className="text-2xl font-bold mb-3 text-center">Set a new password</h1>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {message && <p className="mb-3 text-sm text-emerald-400">{message}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="New password"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Repeat new password"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm font-medium"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400 text-center">
          You&apos;ll be redirected to the login page after a successful reset.
        </p>
      </div>
    </main>
  );
}
