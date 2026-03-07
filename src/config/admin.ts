/**
 * Admin configuration.
 * Centralized list of support and super admin emails.
 */
export const SUPER_ADMIN_EMAILS = [
    'ctinferdi@gmail.com',
    'ibrahim.erhan1@gmail.com'
];

/**
 * Checks if a user email belongs to a super admin.
 */
export const isUserSuperAdmin = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
};
