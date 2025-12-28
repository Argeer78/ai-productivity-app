
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const AUTH_KEYS = {
    "auth.aiSubtitle": "AI trip planning uses your daily AI limit and is linked to your account.",
    "auth.aiTitle": "Log in to generate an AI trip plan",
    "auth.backHome.link": "← Back to home",
    "auth.email.placeholder": "Email",
    "auth.error.authFailed": "Authentication failed.",
    "auth.error.emailRequired": "Please enter your email.",
    "auth.error.googleFailed": "Google sign-in failed.",
    "auth.error.passwordRequired": "Please enter your password.",
    "auth.error.passwordShort": "Password must be at least 6 characters.",
    "auth.error.resetFailed": "Failed to send reset email.",
    "auth.forgot.button": "Send reset email",
    "auth.forgot.title": "Reset password",
    "auth.google.button": "Continue with Google",
    "auth.language.label": "Language",
    "auth.loading.button": "Please wait…",
    "auth.login.button": "Log in",
    "auth.login.title": "Log in",
    "auth.message.loginSuccess": "Logged in! Redirecting to your dashboard…",
    "auth.message.resetSent": "If an account exists for this email, a reset link has been sent.",
    "auth.message.signupSuccess": "Signup successful! Check your email for confirmation, then log in.",
    "auth.password.placeholder": "Password (min 6 characters)",
    "auth.redirect.note": "After login you’ll be redirected to your dashboard.",
    "auth.saveSubtitle": "Saved trips are stored in your account so you can access them later.",
    "auth.saveTitle": "Log in to save this trip",
    "auth.signup.button": "Sign up",
    "auth.signup.title": "Sign up",
    "auth.subtitle": "Log in to save trips and access them later.",
    "auth.title": "Create a free account"
};

async function main() {
    console.log("Checking EN auth keys...");

    const { data: existing, error } = await supabase
        .from("ui_translations")
        .select("key, text")
        .eq("language_code", "en")
        .in("key", Object.keys(AUTH_KEYS));

    if (error) {
        console.error("Error reading DB:", error);
        return;
    }

    const existingMap = new Map(existing?.map(x => [x.key, x.text]));
    const missingOrEmpty = [];

    for (const [key, text] of Object.entries(AUTH_KEYS)) {
        if (!existingMap.has(key) || !existingMap.get(key)) {
            missingOrEmpty.push({ key, language_code: "en", text });
        }
    }

    console.log(`Found ${missingOrEmpty.length} missing/empty keys.`);

    if (missingOrEmpty.length > 0) {
        const { error: upsertErr } = await supabase
            .from("ui_translations")
            .upsert(missingOrEmpty, { onConflict: "key,language_code" });

        if (upsertErr) console.error("Upsert failed:", upsertErr);
        else console.log("✅ Successfully upserted missing keys.");
    } else {
        console.log("All keys present and correct.");
    }
}

main();
