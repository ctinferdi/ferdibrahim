/**
 * Normalizes a string to Turkish uppercase.
 * Handles 'i' -> 'İ' and 'ı' -> 'I' correctly.
 */
export const toTurkishUpperCase = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .toUpperCase();
};

/**
 * Normalizes a string to Turkish lowercase.
 */
export const toTurkishLowerCase = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .toLowerCase();
};
