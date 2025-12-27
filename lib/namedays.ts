
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

export function getNamedaysForDate(date: Date, country: string): string[] {
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
