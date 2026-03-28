import { useEffect } from 'react';

/**
 * Global background refresh hook.
 * Dispatches a 'system-refresh' event every 3 seconds.
 * Components can listen to this event to trigger their own data refreshes.
 */
export const useBackgroundRefresh = () => {
    useEffect(() => {
        const interval = setInterval(() => {
            // Dispatch a custom event for background refresh
            window.dispatchEvent(new CustomEvent('system-refresh'));
        }, 3000);

        return () => clearInterval(interval);
    }, []);
};
