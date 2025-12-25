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

/**
 * Build a detailed error message showing which env vars are missing
 */
function buildConfigErrorMessage(): string {
    const missing: string[] = [];
    const present: string[] = [];

    Object.entries(firebaseConfig).forEach(([key, value]) => {
        const envName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        if (!value) {
            missing.push(envName);
        } else {
            present.push(envName);
        }
    });

    let message = '\n' + '='.repeat(80) + '\n';
    message += '🔥 FATAL: Firebase Configuration Missing!\n';
    message += '='.repeat(80) + '\n\n';

    if (missing.length > 0) {
        message += '❌ MISSING Required Variables:\n';
        missing.forEach(name => {
            message += `   - ${name}\n`;
        });
        message += '\n';
    }

    if (present.length > 0) {
        message += '✅ Present Variables:\n';
        present.forEach(name => {
            message += `   - ${name}\n`;
        });
        message += '\n';
    }

    message += '📋 Critical Variables Required:\n';
    message += '   - NEXT_PUBLIC_FIREBASE_API_KEY\n';
    message += '   - NEXT_PUBLIC_FIREBASE_DATABASE_URL\n';
    message += '   - NEXT_PUBLIC_FIREBASE_PROJECT_ID\n\n';

    message += '🔧 How to Fix:\n';
    message += '   1. Create .env.local file in project root (for local development)\n';
    message += '   2. Add all NEXT_PUBLIC_FIREBASE_* variables\n';
    message += '   3. For production: Set env vars in Vercel/Netlify/hosting platform\n';
    message += '   4. IMPORTANT: Redeploy after adding env vars (Next.js bakes them at build time)\n\n';

    message += '🌐 Database URL format should be:\n';
    message += '   https://YOUR-PROJECT-ID.firebaseio.com\n';
    message += '   or\n';
    message += '   https://YOUR-PROJECT-ID.DATABASE-REGION.firebasedatabase.app\n\n';

    message += '='.repeat(80) + '\n';

    return message;
}

// Initialize Firebase only if config exists and on client-side
// Note: These are typed as non-nullable for TypeScript compatibility,
// but may be undefined at runtime if config is missing. Always check
// isFirebaseInitialized() or use getDb()/getAuth_() before using.
let db: Database = null as unknown as Database;
let auth: Auth = null as unknown as Auth;
let initializationError: Error | null = null;

if (typeof window !== 'undefined') {
    if (!hasFirebaseConfig) {
        const errorMessage = buildConfigErrorMessage();
        console.error(errorMessage);

        // Store the error for later display
        initializationError = new Error('Firebase configuration missing - check console for details');

        // Show alert in development
        if (process.env.NODE_ENV === 'development') {
            // Use setTimeout to not block page load
            setTimeout(() => {
                alert('❌ Firebase configuration missing!\n\nCheck browser console for details.\n\nYou need to set NEXT_PUBLIC_FIREBASE_* environment variables.');
            }, 1000);
        }

        // Throw error to make it visible in error boundaries and crash reports
        throw new Error(
            'FATAL: Firebase configuration missing. ' +
            'Required: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_DATABASE_URL, NEXT_PUBLIC_FIREBASE_PROJECT_ID. ' +
            `Missing: ${!firebaseConfig.apiKey ? 'API_KEY ' : ''}${!firebaseConfig.databaseURL ? 'DATABASE_URL ' : ''}${!firebaseConfig.projectId ? 'PROJECT_ID ' : ''}`
        );
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
            console.log(`   Database: ${firebaseConfig.databaseURL}`);
            console.log(`   Project: ${firebaseConfig.projectId}`);
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            initializationError = error instanceof Error ? error : new Error(String(error));

            // Show detailed error
            console.error('\n' + '='.repeat(80));
            console.error('🔥 Firebase Initialization Error Details:');
            console.error('='.repeat(80));
            console.error('Error:', error);
            console.error('\nConfig used:');
            console.error('  - API Key:', firebaseConfig.apiKey ? '✓ Present' : '✗ Missing');
            console.error('  - Database URL:', firebaseConfig.databaseURL || '✗ Missing');
            console.error('  - Project ID:', firebaseConfig.projectId || '✗ Missing');
            console.error('='.repeat(80) + '\n');

            // Throw to make it visible
            throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Check if Firebase is properly initialized.
 * Use this before making any Firebase calls.
 */
export const isFirebaseInitialized = (): boolean => {
    return db !== undefined && db !== null && auth !== undefined && auth !== null;
};

/**
 * Get the initialization error if one occurred.
 * Use this to show user-friendly error messages.
 */
export const getInitializationError = (): Error | null => {
    return initializationError;
};

/**
 * Get the database instance with runtime check.
 * Throws an error if Firebase is not initialized.
 */
export const getDb = (): Database => {
    if (!db || initializationError) {
        const errorMsg = initializationError
            ? `Firebase initialization failed: ${initializationError.message}`
            : 'Firebase database not initialized. Check your environment variables.';

        console.error('\n' + '='.repeat(80));
        console.error('❌ Attempted to use Firebase database before initialization!');
        console.error('='.repeat(80));
        console.error('Error:', errorMsg);
        console.error('\nRequired environment variables:');
        console.error('  - NEXT_PUBLIC_FIREBASE_API_KEY');
        console.error('  - NEXT_PUBLIC_FIREBASE_DATABASE_URL');
        console.error('  - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
        console.error('\nSee docs/firebase-diagnostic.js for troubleshooting script');
        console.error('='.repeat(80) + '\n');

        throw new Error(errorMsg);
    }
    return db;
};

/**
 * Get the auth instance with runtime check.
 * Throws an error if Firebase is not initialized.
 */
export const getAuth_ = (): Auth => {
    if (!auth || initializationError) {
        const errorMsg = initializationError
            ? `Firebase initialization failed: ${initializationError.message}`
            : 'Firebase auth not initialized. Check your environment variables.';

        console.error('\n' + '='.repeat(80));
        console.error('❌ Attempted to use Firebase auth before initialization!');
        console.error('='.repeat(80));
        console.error('Error:', errorMsg);
        console.error('\nRequired environment variables:');
        console.error('  - NEXT_PUBLIC_FIREBASE_API_KEY');
        console.error('  - NEXT_PUBLIC_FIREBASE_DATABASE_URL');
        console.error('  - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
        console.error('\nSee docs/firebase-diagnostic.js for troubleshooting script');
        console.error('='.repeat(80) + '\n');

        throw new Error(errorMsg);
    }
    return auth;
};

export { db, auth };
