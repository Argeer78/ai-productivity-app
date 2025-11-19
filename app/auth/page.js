"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  // "login" | "signup" | "forgot"
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter an email address.");
      return;
    }

    // 🔐 Forgot password: send reset email
    if (mode === "forgot") {
      try {
        setLoading(true);

        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/update-password`
            : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (error) throw error;

        setMessage(
          "If an account exists with that email, a reset link has been sent."
        );
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to send reset email.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // For login / signup, we also need a password
    if (!password) {
      setError("Please enter a password.");
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

        setMessage("Logged in! Redirecting to your dashboard...");
        // simple redirect
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "login"
      ? "Log in"
      : mode === "signup"
      ? "Sign up"
      : "Reset password";

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md border border-slate-800 rounded-2xl p-6 bg-slate-900/70 shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">{title}</h1>

        {/* mode switch (login / signup) */}
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

        {error && (
          <div className="mb-3 text-sm text-red-400">{error}</div>
        )}
        {message && (
          <div className="mb-3 text-sm text-emerald-400">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Hide password input in forgot mode */}
          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {/* Forgot password link (in login mode) */}
          {mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setPassword("");
                setMessage("");
                setError("");
              }}
              className="text-xs text-indigo-300 hover:text-indigo-200 self-start"
            >
              Forgot your password?
            </button>
          )}

          {/* Back from forgot -> login */}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
                setError("");
              }}
              className="text-xs text-indigo-300 hover:text-indigo-200 self-start"
            >
              ← Back to log in
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm font-medium w-full"
          >
            {loading
              ? mode === "login"
                ? "Logging in..."
                : mode === "signup"
                ? "Signing up..."
                : "Sending reset link..."
              : mode === "login"
              ? "Log in"
              : mode === "signup"
              ? "Sign up"
              : "Send reset email"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400 text-center">
          After logging in, you&apos;ll be redirected to your dashboard.
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
