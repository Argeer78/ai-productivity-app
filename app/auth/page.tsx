"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUiLanguage } from "@/app/components/UiLanguageProvider";

type Mode = "login" | "signup" | "forgot";

/* ------------------------------------------------------------------ */
/* 🌍 Supported languages (FULL LIST – safe with fallback) */
/* ------------------------------------------------------------------ */
const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸", region: "Global", popular: true },
  { code: "de", label: "German", flag: "🇩🇪", region: "Europe" },
  { code: "es", label: "Spanish", flag: "🇪🇸", region: "Europe/LatAm" },
  { code: "fr", label: "French", flag: "🇫🇷", region: "Europe" },
  { code: "it", label: "Italian", flag: "🇮🇹", region: "Europe" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹", region: "Europe", popular: true },
  { code: "el", label: "Greek", flag: "🇬🇷", region: "Europe" },
  { code: "tr", label: "Turkish", flag: "🇹🇷", region: "Europe/Asia" },
  { code: "ru", label: "Russian", flag: "🇷🇺", region: "Europe/Asia" },
  { code: "ro", label: "Romanian", flag: "🇷🇴", region: "Europe" },
  { code: "ar", label: "Arabic (Standard)", flag: "🇺🇳", region: "Middle East" },
  { code: "he", label: "Hebrew", flag: "🇮🇱", region: "Middle East" },
  { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳", region: "Asia" },
  { code: "ja", label: "Japanese", flag: "🇯🇵", region: "Asia" },
  { code: "id", label: "Indonesian", flag: "🇮🇩", region: "Asia" },
  { code: "hi", label: "Hindi", flag: "🇮🇳", region: "Popular", popular: true },
  { code: "ko", label: "Korean", flag: "🇰🇷", region: "Popular", popular: true },
  { code: "sr", label: "Serbian", flag: "🇷🇸", region: "Europe" },
  { code: "bg", label: "Bulgarian", flag: "🇧🇬", region: "Europe" },
  { code: "hu", label: "Hungarian", flag: "🇭🇺", region: "Europe" },
  { code: "pl", label: "Polish", flag: "🇵🇱", region: "Europe" },
  { code: "cs", label: "Czech", flag: "🇨🇿", region: "Europe" },
  { code: "da", label: "Danish", flag: "🇩🇰", region: "Europe" },
  { code: "sv", label: "Swedish", flag: "🇸🇪", region: "Europe" },
  { code: "nb", label: "Norwegian (Bokmål)", flag: "🇳🇴", region: "Europe" },
  { code: "nl", label: "Dutch (Netherlands)", flag: "🇳🇱", region: "Europe" },
];

/* ------------------------------------------------------------------ */
/* 🗣️ Minimal inline strings (English = fallback) */
/* ------------------------------------------------------------------ */
const TEXT = {
  en: {
    login: "Log in",
    signup: "Sign up",
    forgot: "Reset password",
    email: "Email",
    password: "Password (min 6 chars)",
    pleaseWait: "Please wait…",
    sendReset: "Send reset email",
    google: "Continue with Google",
    backHome: "← Back to home",
    redirectNote: "After login you’ll be redirected to your dashboard.",
    resetInfo:
      "If an account exists for this email, a reset link has been sent.",
    signupSuccess:
      "Signup successful! Check your email for confirmation, then log in.",
    loginSuccess: "Logged in! Redirecting to your dashboard…",
    errors: {
      emailRequired: "Please enter your email.",
      passwordRequired: "Please enter your password.",
      passwordShort: "Password must be at least 6 characters.",
      authFailed: "Authentication failed.",
      googleFailed: "Google sign-in failed.",
      resetFailed: "Failed to send reset email.",
    },
  },
};

/* ------------------------------------------------------------------ */
/* 🧠 Component */
/* ------------------------------------------------------------------ */
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { uiLang, setUiLang } = useUiLanguage();
  const t = TEXT.en; // 🔒 Always fallback to English here

  function resetState(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setError("");
    if (nextMode === "forgot") setPassword("");
  }

  async function saveUiLanguage(userId: string) {
    try {
      await supabase.from("profiles").upsert(
        { id: userId, ui_language: uiLang },
        { onConflict: "id" }
      );
    } catch (err) {
      console.error("[auth] failed to save ui_language", err);
    }
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError(t.errors.emailRequired);
      return;
    }

    if (mode === "forgot") {
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

        setMessage(t.resetInfo);
      } catch {
        setError(t.errors.resetFailed);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError(t.errors.passwordRequired);
      return;
    }
    if (password.length < 6) {
      setError(t.errors.passwordShort);
      return;
    }

    try {
      setLoading(true);

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) await saveUiLanguage(data.user.id);
        setMessage(t.signupSuccess);
        setMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) await saveUiLanguage(data.user.id);
        setMessage(t.loginSuccess);
        setTimeout(() => (window.location.href = "/dashboard"), 800);
      }
    } catch {
      setError(t.errors.authFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch {
      setError(t.errors.googleFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md border border-slate-800 rounded-2xl p-6 bg-slate-900/70 shadow-lg">
        {/* 🌍 Language selector */}
        <div className="flex justify-end mb-3">
          <select
  value={uiLang}
  onChange={(e) => setUiLang(e.target.value)}
  className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2 py-1"
>
  {LANGUAGES.map((l) => (
    <option key={l.code} value={l.code}>
      {l.flag} {l.label}
    </option>
  ))}
</select>
        </div>

        <h1 className="text-2xl font-bold mb-4 text-center">
          {mode === "login"
            ? t.login
            : mode === "signup"
            ? t.signup
            : t.forgot}
        </h1>

        {/* Mode toggles */}
        <div className="flex justify-center gap-3 mb-4 text-sm">
          <button onClick={() => resetState("login")}>{t.login}</button>
          <button onClick={() => resetState("signup")}>{t.signup}</button>
          <button onClick={() => resetState("forgot")}>{t.forgot}</button>
        </div>

        {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
        {message && (
          <div className="mb-3 text-sm text-emerald-400">{message}</div>
        )}

        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700"
          />

          {mode !== "forgot" && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-900 border border-slate-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading
              ? t.pleaseWait
              : mode === "forgot"
              ? t.sendReset
              : mode === "login"
              ? t.login
              : t.signup}
          </button>
        </form>

        {mode !== "forgot" && (
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-4 w-full px-4 py-2 rounded-xl bg-white text-slate-900"
          >
            🔑 {t.google}
          </button>
        )}

        <p className="mt-4 text-xs text-slate-400 text-center">
          {t.redirectNote}
        </p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs hover:text-indigo-300">
            {t.backHome}
          </Link>
        </div>
      </div>
    </main>
  );
}
