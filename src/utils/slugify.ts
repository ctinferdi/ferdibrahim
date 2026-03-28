export const slugify = (text: string): string => {
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U',
        'ı': 'i', 'İ': 'I',
        'ö': 'o', 'Ö': 'O'
    };

    return text
        .split('')
        .map(char => trMap[char] || char)
        .join('')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with -
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing -
};
