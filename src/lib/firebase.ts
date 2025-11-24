import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { getAuth, Auth } from "firebase/auth";

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

// Initialize Firebase only on client-side
let app: FirebaseApp;
let db: Database;
let auth: Auth;

if (typeof window !== 'undefined') {
    // Initialize Firebase
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

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
