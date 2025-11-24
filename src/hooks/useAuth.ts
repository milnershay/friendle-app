"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import toast from "react-hot-toast";

export interface AuthState {
    user: User | null;
    loading: boolean;
}

/**
 * A hook to manage Firebase anonymous authentication.
 * It handles signing in the user on their first visit and provides
 * the current user's authentication state.
 *
 * @returns {AuthState} An object containing the current user and loading state.
 */
export const useAuth = (): AuthState => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in
                setUser(firebaseUser);
                setLoading(false);
            } else {
                // User is signed out, sign them in anonymously
                try {
                    const userCredential = await signInAnonymously(auth);
                    setUser(userCredential.user);
                } catch (error) {
                    console.error("Error signing in anonymously:", error);
                    toast.error("Failed to authenticate. Please try again later.");
                    // Handle the error appropriately in a real app
                } finally {
                    setLoading(false);
                }
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    return { user, loading };
};
