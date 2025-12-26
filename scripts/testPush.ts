import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:hello@aiprod.app";

if (!publicKey || !privateKey) {
    console.error("Missing VAPID keys!");
    process.exit(1);
}

webpush.setVapidDetails(subject, publicKey, privateKey);

async function testPush() {
    console.log("Fetching subscriptions...");
    const { data: subs, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error || !subs || subs.length === 0) {
        console.error("No subscriptions found.", error);
        return;
    }

    console.log(`Sending test push to ${subs.length} endpoints...`);
    let logOutput = `Push Test Results (${new Date().toISOString()}):\n\n`;

    for (const sub of subs) {
        logOutput += `Target: ${sub.endpoint.slice(0, 40)}...\n`;
        try {
            const result = await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth,
                    },
                },
                JSON.stringify({
                    title: "Test Push (Mobile Check)",
                    body: "If you see this on mobile, it works! 📱",
                    url: "https://aiprod.app/tasks"
                })
            );
            console.log(`✅ Sent to ${sub.endpoint.slice(0, 20)}...`);
            logOutput += `✅ SUCCESS - Status: ${result.statusCode}\n`;
        } catch (err: any) {
            console.error(`❌ Failed: ${err.statusCode}`);
            logOutput += `❌ FAILED - Status: ${err.statusCode} - Msg: ${err.message}\n`;
        }
        logOutput += "--------------------------------------------------\n";
    }

    fs.writeFileSync('scripts/push_result.txt', logOutput);
    console.log("Detailed logs written to scripts/push_result.txt");
}

testPush();
