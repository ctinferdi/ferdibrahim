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
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // --- SESSION TIMEOUT (1 HOUR) ---
        let lastActivity = Date.now();
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

        const resetTimer = () => {
            lastActivity = Date.now();
        };

        activityEvents.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        const timeoutInterval = setInterval(() => {
            const now = Date.now();
            const oneHourInMs = 60 * 60 * 1000;
            if (user && (now - lastActivity > oneHourInMs)) {
                console.log('Session timed out due to inactivity');
                signOut();
            }
        }, 60000); // Check every minute

        return () => {
            subscription.unsubscribe();
            activityEvents.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
            clearInterval(timeoutInterval);
        };
    }, [user]);

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
