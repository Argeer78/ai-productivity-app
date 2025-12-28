
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)?.trim();

    console.log("Checking for key duplication...");

    if (!anon) console.log("WARN: Anon key missing");
    if (!service) console.log("WARN: Service key missing");

    if (anon && service) {
        if (anon === service) {
            console.log("🚨 CRITICAL: Service Key IS IDENTICAL to Anon Key!");
            console.log("This means the 'Admin' client is actually just an Anon client.");
        } else {
            console.log("✅ Keys are different.");
            // Optional: Print first few chars to prove
            console.log(`Anon: ${anon.substring(0, 5)}...`);
            console.log(`Service: ${service.substring(0, 5)}...`);
        }
    }
}

main();
