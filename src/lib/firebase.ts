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
let db: Database;
let auth: Auth;

if (typeof window !== 'undefined' && hasFirebaseConfig) {
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
}

export { db, auth };
