"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Mode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetState(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setError("");
    if (nextMode === "forgot") {
      setPassword("");
    }
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    if (mode === "forgot") {
      // SEND RESET EMAIL
      try {
        setLoading(true);

        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/reset`
            : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (error) throw error;

        setMessage(
          "If an account exists for this email, a reset link has been sent."
        );
      } catch (err: any) {
        console.error("[auth] reset password error", err);
        setError(err.message || "Failed to send reset email.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // LOGIN / SIGNUP
    if (!password) {
      setError("Please enter your password.");
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

        setMessage(
          "Signup successful! Check your email for confirmation, then you can log in."
        );
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setMessage("Logged in! Redirecting to your dashboard…");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 800);
      }
    } catch (err: any) {
      console.error("[auth] auth error", err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) throw error;
      // Google will redirect away; nothing else to do here
    } catch (err: any) {
      console.error("[auth] Google login error", err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md border border-slate-800 rounded-2xl p-6 bg-slate-900/70 shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {mode === "login"
            ? "Log in"
            : mode === "signup"
            ? "Sign up"
            : "Reset password"}
        </h1>

        {/* Mode toggles */}
        <div className="flex justify-center gap-3 mb-4 text-sm">
          <button
            className={`px-3 py-1 rounded-full border ${
              mode === "login"
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-slate-700"
            }`}
            onClick={() => resetState("login")}
          >
            Log in
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${
              mode === "signup"
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-slate-700"
            }`}
            onClick={() => resetState("signup")}
          >
            Sign up
          </button>
          <button
            className={`px-3 py-1 rounded-full border ${
              mode === "forgot"
                ? "border-indigo-500 bg-indigo-600/20"
                : "border-slate-700"
            }`}
            onClick={() => resetState("forgot")}
          >
            Forgot?
          </button>
        </div>

        {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
        {message && (
          <div className="mb-3 text-sm text-emerald-400">{message}</div>
        )}

        {/* Form */}
        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm font-medium"
          >
            {loading
              ? mode === "login"
                ? "Logging in..."
                : mode === "signup"
                ? "Signing up..."
                : "Sending..."
              : mode === "login"
              ? "Log in"
              : mode === "signup"
              ? "Sign up"
              : "Send reset email"}
          </button>
        </form>

        {/* Google login */}
        {mode !== "forgot" && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
            >
              <span>🔑</span>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-400 text-center">
          After logging in, you&apos;ll be redirected to your dashboard.
        </p>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-slate-300 hover:text-indigo-300"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
