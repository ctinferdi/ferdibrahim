/**
 * Admin configuration.
 * Centralized list of support and super admin emails.
 */
export const SUPER_ADMIN_EMAILS: string[] = [
    'ctinferdi@gmail.com'
].map((e: string) => e.toLowerCase());

/**
 * Checks if a user email belongs to a super admin.
 * Uses a named function declaration for reliable bundler compatibility.
 */
export function isUserSuperAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
