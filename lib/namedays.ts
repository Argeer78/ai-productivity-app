
// Major Greek Namedays (Fixed & Movable)
// Source: Common knowledge / eortologio

export const GREEK_NAMEDAYS_FIXED: Record<string, string[]> = {
    "01-01": ["Vasilis", "Vaso"],
    "01-06": ["Fotis", "Fotini", "Iordanis", "Ourania"],
    "01-07": ["Ioannis", "Ioanna", "Giannis"],
    "01-17": ["Antonios", "Antonia"],
    "01-18": ["Thanasis", "Athanasia"],
    "01-20": ["Efthymios"],
    "01-25": ["Grigoris"],
    "02-10": ["Haralambos"],
    "03-25": ["Vangelis", "Evangelia"],
    "05-21": ["Konstantinos", "Eleni"],
    "06-29": ["Petros", "Pavlos"],
    "07-17": ["Marina"],
    "07-20": ["Ilias"],
    "07-26": ["Paraskevi"],
    "08-15": ["Maria", "Panagiotis", "Despoina", "Marios"],
    "08-30": ["Alexandros"],
    "09-14": ["Stavros", "Stavroula"],
    "09-17": ["Sofia", "Agapi", "Elpida"],
    "10-26": ["Dimitris", "Dimitra"],
    "11-08": ["Aggelos", "Michalis", "Gabriel", "Stamatis"],
    "11-14": ["Filippos"],
    "11-21": ["Maria" /* Virgin Mary entry */],
    "11-25": ["Katerina"],
    "11-30": ["Andreas"],
    "12-04": ["Barbara"],
    "12-06": ["Nikolaos", "Nikoleta"],
    "12-09": ["Anna"],
    "12-12": ["Spyros"],
    "12-15": ["Eleftherios"],
    "12-25": ["Christos", "Chrysa"],
    "12-27": ["Stefanos", "Stefania"],
};

/**
 * Calculates Orthodox Easter Date for a given year using Meeus/Jones/Butcher's algorithm
 * Returns Date object (time set to noon to avoid timezone edge cases)
 */
function getOrthodoxEaster(year: number): Date {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    const date = new Date(year, month - 1, day + 13); // Julian to Gregorian offset (+13 days for 1900-2099)
    return date;
}

/**
 * Adds days to a date and returns simplified MM-DD key
 */
function addDays(date: Date, days: number): string {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    const mm = (result.getMonth() + 1).toString().padStart(2, "0");
    const dd = result.getDate().toString().padStart(2, "0");
    return `${mm}-${dd}`;
}

export function getNamedaysForDate(date: Date, country: string): string[] {
    if (country !== "GR") return [];

    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    const key = `${mm}-${dd}`;

    const names = GREEK_NAMEDAYS_FIXED[key] ? [...GREEK_NAMEDAYS_FIXED[key]] : [];

    // Movable Calculation
    const year = date.getFullYear();
    const easter = getOrthodoxEaster(year);

    // Check Movable Offsets
    const checkDateKey = (offset: number, namesToAdd: string[]) => {
        if (addDays(easter, offset) === key) {
            names.push(...namesToAdd);
        }
    };

    // Easter Sunday
    checkDateKey(0, ["Anastasia", "Anastasios", "Lambros"]);
    // Easter Monday
    checkDateKey(1, ["Georgios", "Georgia"]); // *George moves to Easter Monday if April 23 is in Lent
    // Thomas (Sunday after Easter)
    checkDateKey(7, ["Thomas", "Thomais"]);
    // Zoodochou Pigis (Friday after Easter)
    checkDateKey(5, ["Zois", "Pigi"]);
    // Agiou Pnevmatos (Holy Spirit - 50 days after Easter? Actually 50 is Pentacost, Holy Spirit is +1 day = 51)
    // Wait, Pentecost is 49 days after Easter (7 weeks). Holy Spirit is Monday after Pentecost (50 days after Easter Sunday).
    checkDateKey(50, ["Triada", "Koris"]);

    // St. George Logic:
    // If April 23 is BEFORE or ON Easter, George moves to Easter Monday.
    // If April 23 is AFTER Easter, George is on April 23.
    // My check above (offset 1) handles the moved case.
    // But I need to REMOVE George from Fixed if it moved.
    // Actually, simplified: users look for "George" on the day.
    // Let's verify:
    const april23 = new Date(year, 3, 23); // Month is 0-indexed
    if (april23 <= easter) {
        // George is movable (Easter Monday)
        // I added it at offset 1 above.
        // But I also need to make sure GREEK_NAMEDAYS_FIXED["04-23"] doesn't show it if I had included it there.
        // I commented it out in fixed list above to handle here manually.
    } else {
        // George is Fixed (Apr 23)
        if (key === "04-23") names.push("Georgios", "Georgia");
        // And we must ensure offset 1 DOES NOT show it? 
        // My offset 1 check adds it if today is Easter Monday.
        // If Apr 23 > Easter, then Easter Monday is NOT Apr 23. So we are fine adding it on Easter Monday?
        // WAIT. If George is Fixed, it is NOT celebrated on Easter Monday.
        // So condition:
        if (addDays(easter, 1) === key && april23 > easter) {
            // Today IS Easter Monday, but George is Fixed (passed), so remove?
            // No, I added it manually in `checkDateKey`.
            // I need to condition the PUSH.
        }
    }

    // Refined Logic for George:
    const isGeorgeMovable = april23 <= easter;
    const isEasterMonday = addDays(easter, 1) === key;
    const isApril23 = key === "04-23";

    if (isGeorgeMovable && isEasterMonday) {
        // Add if not already there (it might be added by my simple check above)
        if (!names.includes("Georgios")) names.push("Georgios", "Georgia");
    } else if (!isGeorgeMovable && isApril23) {
        if (!names.includes("Georgios")) names.push("Georgios", "Georgia");
    } else {
        // If I added it via simple offset check but it shouldn't be there (e.g. today is Easter Monday but George is fixed), filtering is hard.
        // Better strategy: Don't use generic valid checker for George.
    }

    return names;
}

// Redefining export to include the logic cleanly
export function getNamedaysForDateFinal(date: Date, country: string): string[] {
    if (country !== "GR") return [];

    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    const key = `${mm}-${dd}`;

    // Start with Fixed (excluding George)
    let names = GREEK_NAMEDAYS_FIXED[key] ? [...GREEK_NAMEDAYS_FIXED[key]] : [];

    const year = date.getFullYear();
    const easter = getOrthodoxEaster(year);
    const april23 = new Date(year, 3, 23);
    const isGeorgeMovable = april23 <= easter;

    // Helper for matching date string
    const isDate = (d: Date) => {
        const d_mm = (d.getMonth() + 1).toString().padStart(2, "0");
        const d_dd = d.getDate().toString().padStart(2, "0");
        return `${d_mm}-${d_dd}` === key;
    };

    // 1. Easter Sunday
    if (isDate(easter)) names.push("Anastasia", "Anastasios", "Lambros");

    // 2. Easter Monday (George if movable)
    const easterMonday = new Date(easter); easterMonday.setDate(easter.getDate() + 1);
    if (isDate(easterMonday) && isGeorgeMovable) names.push("Georgios", "Georgia");

    // 3. April 23 (George if fixed)
    if (key === "04-23" && !isGeorgeMovable) names.push("Georgios", "Georgia");

    // 4. Zoodochou Pigis (Friday after Easter) -> Easter + 5
    const zoodochou = new Date(easter); zoodochou.setDate(easter.getDate() + 5);
    if (isDate(zoodochou)) names.push("Zois", "Pigi");

    // 5. Thomas (Sunday after Easter) -> Easter + 7
    const thomas = new Date(easter); thomas.setDate(easter.getDate() + 7);
    if (isDate(thomas)) names.push("Thomas", "Thomais");

    // 6. Holy Spirit (Monday after Pentecost) -> Easter + 50
    const holySpirit = new Date(easter); holySpirit.setDate(easter.getDate() + 50);
    if (isDate(holySpirit)) names.push("Triada", "Koris");

    // Deduplicate just in case
    return Array.from(new Set(names));
}

// Overwrite the original function name for the file
export { getNamedaysForDateFinal as getNamedaysForDate };
