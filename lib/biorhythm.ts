
/**
 * Calculates BioRhythm cycles based on birthdate.
 * Cycles:
 * - Physical: 23 days
 * - Emotional: 28 days
 * - Intellectual: 33 days
 * 
 * Formula: sin(2 * PI * t / T)
 * where t = days since birth, T = cycle length
 */

export type BioRhythmData = {
    physical: number; // -1 to 1
    emotional: number; // -1 to 1
    intellectual: number; // -1 to 1
    average: number; // -1 to 1
};

export function calculateBioRhythm(targetDate: Date, birthDate: Date): BioRhythmData {
    // Calculate days diff
    const oneDay = 24 * 60 * 60 * 1000;
    const diffTime = targetDate.getTime() - birthDate.getTime();
    const t = Math.round(diffTime / oneDay);

    const physical = Math.sin((2 * Math.PI * t) / 23);
    const emotional = Math.sin((2 * Math.PI * t) / 28);
    const intellectual = Math.sin((2 * Math.PI * t) / 33);

    const average = (physical + emotional + intellectual) / 3;

    return { physical, emotional, intellectual, average };
}

/**
 * Returns a color and label for the energy level (average)
 */
export function getEnergyLevel(average: number): { color: string; label: string; icon: string } {
    if (average > 0.5) return { color: "text-emerald-500", label: "High", icon: "⚡" };
    if (average > 0) return { color: "text-amber-500", label: "Moderate", icon: "🔋" };
    if (average > -0.5) return { color: "text-orange-500", label: "Low", icon: "🪫" };
    return { color: "text-red-500", label: "Critical", icon: "💤" };
}
