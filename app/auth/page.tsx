"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useT } from "@/lib/useT";
import type { Lang } from "@/lib/i18n";

type Mode = "login" | "signup" | "forgot";

/* ------------------------------------------------------------------ */
/* 🌍 Supported languages (same as Settings) */
/* ------------------------------------------------------------------ */
const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "German", flag: "🇩🇪" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "it", label: "Italian", flag: "🇮🇹" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹" },
  { code: "el", label: "Greek", flag: "🇬🇷" },
  { code: "tr", label: "Turkish", flag: "🇹🇷" },
  { code: "ru", label: "Russian", flag: "🇷🇺" },
  { code: "ro", label: "Romanian", flag: "🇷🇴" },
  { code: "ar", label: "Arabic", flag: "🇺🇳" },
  { code: "he", label: "Hebrew", flag: "🇮🇱" },
  { code: "zh", label: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "ja", label: "Japanese", flag: "🇯🇵" },
  { code: "id", label: "Indonesian", flag: "🇮🇩" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "sr", label: "Serbian", flag: "🇷🇸" },
  { code: "bg", label: "Bulgarian", flag: "🇧🇬" },
  { code: "hu", label: "Hungarian", flag: "🇭🇺" },
  { code: "pl", label: "Polish", flag: "🇵🇱" },
  { code: "cs", label: "Czech", flag: "🇨🇿" },
  { code: "da", label: "Danish", flag: "🇩🇰" },
  { code: "sv", label: "Swedish", flag: "🇸🇪" },
  { code: "nb", label: "Norwegian (Bokmål)", flag: "🇳🇴" },
  { code: "nl", label: "Dutch", flag: "🇳🇱" },
];

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

  const { lang, setLang } = useLanguage();
  const { t } = useT("auth");

  function resetState(next: Mode) {
    setMode(next);
    setMessage("");
    setError("");
    if (next === "forgot") setPassword("");
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError(t("error.emailRequired", "Please enter your email."));
      return;
    }

    // RESET PASSWORD
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
        setMessage(t("message.resetSent"));
      } catch {
        setError(t("error.resetFailed"));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError(t("error.passwordRequired"));
      return;
    }

    if (password.length < 6) {
      setError(t("error.passwordShort"));
      return;
    }

    try {
      setLoading(true);

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        setMessage(t("message.signupSuccess"));
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setMessage(t("message.loginSuccess"));
        setTimeout(() => (window.location.href = "/dashboard"), 800);
      }
    } catch {
      setError(t("error.authFailed"));
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
      setError(t("error.googleFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md border border-slate-800 rounded-2xl p-6 bg-slate-900/70 shadow-lg">
        {/* Language selector */}
        <div className="flex justify-end mb-3">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
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
            ? t("login.title")
            : mode === "signup"
            ? t("signup.title")
            : t("forgot.title")}
        </h1>

        <div className="flex justify-center gap-3 mb-4 text-sm">
          <button onClick={() => resetState("login")}>
            {t("login.button")}
          </button>
          <button onClick={() => resetState("signup")}>
            {t("signup.button")}
          </button>
          <button onClick={() => resetState("forgot")}>
            {t("forgot.title")}
          </button>
        </div>

        {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
        {message && (
          <div className="mb-3 text-sm text-emerald-400">{message}</div>
        )}

        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder={t("email.placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700"
          />

          {mode !== "forgot" && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("password.placeholder")}
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
              ? t("loading.button")
              : mode === "forgot"
              ? t("forgot.button")
              : mode === "login"
              ? t("login.button")
              : t("signup.button")}
          </button>
        </form>

        {mode !== "forgot" && (
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-4 w-full px-4 py-2 rounded-xl bg-white text-slate-900"
          >
            🔑 {t("google.button")}
          </button>
        )}

        <p className="mt-4 text-xs text-slate-400 text-center">
          {t("redirect.note")}
        </p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs hover:text-indigo-300">
            {t("backHome.link")}
          </Link>
        </div>
      </div>
    </main>
  );
}
