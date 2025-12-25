import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import type { Database } from "firebase/database";
import type { Auth } from "firebase/auth";

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if we have the required config
const hasFirebaseConfig = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.databaseURL;

// Initialize Firebase only if config exists and on client-side
// Note: These are typed as non-nullable for TypeScript compatibility,
// but may be undefined at runtime if config is missing. Always check
// isFirebaseInitialized() or use getDb()/getAuth_() before using.
let db: Database = null as unknown as Database;
let auth: Auth = null as unknown as Auth;

if (typeof window !== 'undefined') {
    if (!hasFirebaseConfig) {
        console.error('❌ Firebase Configuration Missing!');
        console.error('Required environment variables:');
        console.error('- NEXT_PUBLIC_FIREBASE_API_KEY:', firebaseConfig.apiKey ? '✓' : '✗');
        console.error('- NEXT_PUBLIC_FIREBASE_PROJECT_ID:', firebaseConfig.projectId ? '✓' : '✗');
        console.error('- NEXT_PUBLIC_FIREBASE_DATABASE_URL:', firebaseConfig.databaseURL ? '✓' : '✗');
        console.error('Please check your .env.local file or production environment variables.');
    } else {
        try {
            const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

            /**
             * The initialized Firebase Realtime Database instance.
             * Use this to interact with the database.
             */
            db = getDatabase(app);

            /**
             * The initialized Firebase Authentication instance.
             * Use this for all authentication-related tasks.
             */
            auth = getAuth(app);

            console.log('✅ Firebase initialized successfully');
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
        }
    }
}

/**
 * Check if Firebase is properly initialized.
 * Use this before making any Firebase calls.
 */
export const isFirebaseInitialized = (): boolean => {
    return db !== undefined && auth !== undefined;
};

/**
 * Get the database instance with runtime check.
 * Throws an error if Firebase is not initialized.
 */
export const getDb = (): Database => {
    if (!db) {
        throw new Error('Firebase database not initialized. Check your environment variables.');
    }
    return db;
};

/**
 * Get the auth instance with runtime check.
 * Throws an error if Firebase is not initialized.
 */
export const getAuth_ = (): Auth => {
    if (!auth) {
        throw new Error('Firebase auth not initialized. Check your environment variables.');
    }
    return auth;
};

export { db, auth };
