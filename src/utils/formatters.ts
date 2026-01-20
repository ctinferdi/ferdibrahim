export const formatNumberWithDots = (value: number | string): string => {
    if (value === undefined || value === null || value === '') return '';
    const numberStr = value.toString().replace(/\D/g, '');
    return numberStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseNumberFromDots = (value: string | number): number => {
    if (!value && value !== 0) return 0;
    if (typeof value === 'number') return value;
    return Number(value.replace(/\./g, ''));
};
