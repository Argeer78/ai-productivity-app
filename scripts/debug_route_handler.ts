
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Mock NextRequest and NextResponse
import { NextRequest, NextResponse } from "next/server";
import { GET } from "../app/api/ui-translations/[lang]/route";

async function main() {
    console.log("-----------------------------------------");
    console.log("Debugging Route Handler for 'es' (Spanish)");

    // Mock Context
    const params = Promise.resolve({ lang: "es" });
    const req = new NextRequest("http://localhost:3000/api/ui-translations/es");

    try {
        const response: NextResponse = await GET(req, { params });

        console.log("Status:", response.status);
        const json = await response.json();

        // Print Summary
        console.log("OK:", json?.ok);
        console.log("Language Code:", json?.languageCode);

        const keys = Object.keys(json?.translations || {});
        console.log("Total Translaions:", keys.length);

        // Check a specific key if possible
        // e.g. "common.save" or something generally translated
        const sampleKey = keys.find(k => k.includes("save")) || keys[0];
        console.log(`Sample Key [${sampleKey}]:`, json?.translations?.[sampleKey]);

        if (json?.translations && Object.keys(json?.translations).length < 10) {
            console.log("WARNING: Very few translations found!");
        }

    } catch (e: any) {
        console.error("Handler Error:", e);
    }
    console.log("-----------------------------------------");
}

main();
