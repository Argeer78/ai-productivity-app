"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password || password.length < 6) {
      setError("Password should be at least 6 characters.");
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
        console.error("[update-password] error", error);
        setError(error.message || "Failed to update password.");
        return;
      }

      setMessage("Password updated. You can now log in with your new password.");
      setTimeout(() => {
        window.location.href = "/auth";
      }, 2000);
    } catch (err) {
      console.error("[update-password] exception", err);
      setError("Unexpected error while updating password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <h1 className="text-xl font-semibold mb-3 text-center">
          Set a new password
        </h1>

        {error && (
          <p className="mb-2 text-xs text-red-400 text-center">{error}</p>
        )}
        {message && (
          <p className="mb-2 text-xs text-emerald-400 text-center">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a
            href="/auth"
            className="text-xs text-slate-300 hover:text-indigo-300"
          >
            ← Back to login
          </a>
        </div>
      </div>
    </main>
  );
}
