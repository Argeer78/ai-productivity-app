
const fetch = require("node-fetch"); // assuming node environment for script

async function test(name, langParam) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        name
    )}&count=1&format=json${langParam ? `&language=${langParam}` : ""}`;

    console.log(`Testing: ${url}`);
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log(`Result for lang=${langParam || 'NONE'}:`, data.results ? data.results[0].name : "NOT FOUND");
    } catch (e) {
        console.error("Error:", e.message);
    }
}

async function main() {
    await test("Λονδίνο", "en");
    await test("Λονδίνο", "el");
    await test("Λονδίνο", ""); // no language param
}

main();
