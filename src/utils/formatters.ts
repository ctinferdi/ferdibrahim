export const formatNumberWithDots = (value: number | string): string => {
    if (value === undefined || value === null || value === '') return '';
    const numberStr = value.toString().replace(/\D/g, '');
    return numberStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseNumberFromDots = (value: string): number => {
    if (!value) return 0;
    return Number(value.replace(/\./g, ''));
};
