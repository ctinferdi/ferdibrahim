import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';

// ── Super admin list (inline to avoid cross-chunk bundling issues) ──
const SUPER_ADMIN_EMAILS = ['ctinferdi@gmail.com'];

function checkIsSuperAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isSuperAdmin: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        // 1. Check active session once - clear invalid tokens if found
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.warn('Session error, clearing invalid tokens:', error.message);
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-')) localStorage.removeItem(key);
                });
                setUser(null);
                setIsSuperAdmin(false);
            } else {
                setUser(session?.user ?? null);
                setIsSuperAdmin(checkIsSuperAdmin(session?.user?.email));
            }
            setLoading(false);
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setIsSuperAdmin(checkIsSuperAdmin(session?.user?.email));
            setLoading(false);
        });

        // 3. Session Timeout logic
        let lastActivity = Date.now();
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        const resetTimer = () => { lastActivity = Date.now(); };
        activityEvents.forEach(event => window.addEventListener(event, resetTimer));

        const timeoutInterval = setInterval(() => {
            const now = Date.now();
            const oneHourInMs = 60 * 60 * 1000;
            if (now - lastActivity > oneHourInMs) {
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
            activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
            clearInterval(timeoutInterval);
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setIsSuperAdmin(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, isSuperAdmin, signOut }}>
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
