"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Signup successful! You can now log in.");
        setMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setMessage("Logged in! Redirecting to your notes...");
        // simple redirect
        setTimeout(() => {
          window.location.href = "/notes";
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  // 🔐 Google OAuth login
  async function handleGoogleLogin() {
    setError("");
    setMessage("");

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // where users land AFTER Google login completes
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/dashboard`
              : undefined,
        },
      });

      if (error) throw error;
      // Supabase will redirect automatically.
    } catch (err) {
      console.error("[auth] Google login error", err);
      setError(err.message || "Google login failed.");
      setLoading(false); // only clear loading if we didn't redirect
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md border border-slate-800 rounded-2xl p-6 bg-slate-900/70 shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {mode === "login" ? "Log in" : "Sign up"}
        </h1>

        {/* Mode toggle */}
        <div className="flex justify-center gap-3 mb-4 text-sm">
          <button
            className={`px-3 py-1 rounded-full border ${
              mode === "login"
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-slate-700"
            }`}
            onClick={() => {
              setMode("login");
              setMessage("");
              setError("");
            }}
          >
            Log in
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${
              mode === "signup"
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-slate-700"
            }`}
            onClick={() => {
              setMode("signup");
              setMessage("");
              setError("");
            }}
          >
            Sign up
          </button>
        </div>

        {/* Error & success messages */}
        {error && (
          <div className="mb-3 text-sm text-red-400">{error}</div>
        )}
        {message && (
          <div className="mb-3 text-sm text-emerald-400">
            {message}
          </div>
        )}

        {/* ✅ Google login button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm mb-4 disabled:opacity-60"
        >
          <span className="text-lg">🟦</span>
          <span>
            {loading ? "Connecting to Google…" : "Continue with Google"}
          </span>
        </button>

        {/* Divider */}
        <div className="flex items-center my-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="px-2 text-[10px] uppercase tracking-wide text-slate-500">
            or use email
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password (min 6 chars)"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Forgot password link */}
          {mode === "login" && (
            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-[11px] text-indigo-300 hover:text-indigo-200"
              >
                Forgot your password?
              </a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm font-medium"
          >
            {loading
              ? mode === "login"
                ? "Logging in..."
                : "Signing up..."
              : mode === "login"
              ? "Log in"
              : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400 text-center">
          After logging in, you&apos;ll be redirected to your notes or
          dashboard.
        </p>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-xs text-slate-300 hover:text-indigo-300"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </main>
  );
}
