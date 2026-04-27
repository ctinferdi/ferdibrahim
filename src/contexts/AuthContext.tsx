import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check active session once - clear invalid tokens if found
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                // Geçersiz refresh token varsa temizle
                console.warn('Session error, clearing invalid tokens:', error.message);
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-')) localStorage.removeItem(key);
                });
                setUser(null);
            } else {
                setUser(session?.user ?? null);
            }
            setLoading(false);
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // 3. Session Timeout logic initialization
        let lastActivity = Date.now();
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        const resetTimer = () => { lastActivity = Date.now(); };

        activityEvents.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        const timeoutInterval = setInterval(() => {
            const now = Date.now();
            const oneHourInMs = 60 * 60 * 1000;
            // Use a ref-like approach or just check current state safely
            // Note: In an interval, we will see the LATEST 'user' if we define the function here?
            // Actually, to be safe with closures, we could use a ref for 'user' but
            // for now, let's keep it simple as it's a global singleton state.
            if (now - lastActivity > oneHourInMs) {
                // We'll handle the signout if a user is present
                // supabase.auth.getUser() is safer inside interval than closed-over 'user'
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) {
                        console.log('Session timed out due to inactivity');
                        signOut();
                    }
                });
            }
        }, 60000);

        return () => {
            subscription.unsubscribe();
            activityEvents.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
            clearInterval(timeoutInterval);
        };
    }, []); // Empty array - run once on mount

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const value = {
        user,
        loading,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
