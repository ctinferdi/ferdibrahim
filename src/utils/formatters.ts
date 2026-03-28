// Formats a non-negative integer as a dot-separated Turkish currency string.
// Contract: integer-only, non-negative. Decimal and comma characters are stripped
// (Turkish currency values in this app are always whole lira amounts).
// String inputs (e.g. mid-typing in a controlled input) are stripped directly to avoid
// Number() coercion, which would reset the cursor position on every keystroke.
// Number inputs are rounded and their absolute value is used.
export const formatNumberWithDots = (value: number | string | null | undefined): string => {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'string') {
        const digitsOnly = value.replace(/\D/g, '');
        if (!digitsOnly) return '';
        return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    if (isNaN(value)) return '';
    const rounded = Math.round(Math.abs(value));
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseNumberFromDots = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const cleaned = value.replace(/[\.,]/g, '');
    const parsed = Number(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};
