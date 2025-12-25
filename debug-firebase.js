/**
 * Firebase Connection Debug Script
 *
 * HOW TO USE:
 * 1. Open your production site in a browser
 * 2. Open the browser console (F12 or right-click > Inspect > Console)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run it
 *
 * This script will diagnose Firebase connection issues and print detailed information.
 */

console.log('🔍 Starting Firebase Connection Diagnostic...\n');

// ========================================
// 1. Check Environment Variables
// ========================================
console.group('1️⃣ Environment Variables Check');
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

let missingVars = [];
requiredEnvVars.forEach(varName => {
  // In Next.js, env vars are bundled at build time, so we can't check process.env directly in browser
  // Instead, we'll check if Firebase initialized successfully
  console.log(`  ${varName}: Cannot check directly in browser (bundled at build time)`);
});

console.log('\n  💡 To verify environment variables:');
console.log('     - Check your hosting provider dashboard (Vercel/Netlify/etc.)');
console.log('     - Ensure all NEXT_PUBLIC_* variables are set');
console.log('     - Rebuild and redeploy after adding variables');
console.groupEnd();

// ========================================
// 2. Check Firebase SDK Loaded
// ========================================
console.group('2️⃣ Firebase SDK Check');
if (typeof window !== 'undefined') {
  // Check if Firebase modules are available
  try {
    const firebaseApp = await import('firebase/app');
    const firebaseDb = await import('firebase/database');
    const firebaseAuth = await import('firebase/auth');
    console.log('  ✅ Firebase SDK loaded successfully');
    console.log(`     - firebase/app: ✓`);
    console.log(`     - firebase/database: ✓`);
    console.log(`     - firebase/auth: ✓`);
  } catch (err) {
    console.error('  ❌ Firebase SDK failed to load:', err);
  }
} else {
  console.log('  ⚠️  Running on server-side (SSR), Firebase should be client-side only');
}
console.groupEnd();

// ========================================
// 3. Check Firebase Initialization
// ========================================
console.group('3️⃣ Firebase Initialization Check');
try {
  // Try to access the db and auth exports from the app
  // This requires the module to be imported
  const { db, auth, isFirebaseInitialized } = await import('/src/lib/firebase');

  if (typeof isFirebaseInitialized === 'function') {
    const initialized = isFirebaseInitialized();
    if (initialized) {
      console.log('  ✅ Firebase initialized successfully');
      console.log(`     - Database: ${db ? '✓' : '✗'}`);
      console.log(`     - Auth: ${auth ? '✓' : '✗'}`);
    } else {
      console.error('  ❌ Firebase NOT initialized');
      console.log('     - Database:', db || 'undefined');
      console.log('     - Auth:', auth || 'undefined');
      console.log('\n  🔧 Troubleshooting steps:');
      console.log('     1. Check browser console for "Firebase Configuration Missing" errors');
      console.log('     2. Verify environment variables are set in your hosting provider');
      console.log('     3. Rebuild and redeploy your application');
      console.log('     4. Check for any ad blockers or network restrictions blocking Firebase');
    }
  } else {
    console.log('  ⚠️  isFirebaseInitialized function not found (using older version of firebase.ts)');
    console.log(`     - Database: ${db ? '✓ (initialized)' : '✗ (undefined)'}`);
    console.log(`     - Auth: ${auth ? '✓ (initialized)' : '✗ (undefined)'}`);
  }
} catch (err) {
  console.error('  ❌ Failed to import firebase module:', err);
  console.log('     This usually means the app failed to build or deploy correctly');
}
console.groupEnd();

// ========================================
// 4. Test Firebase Connection
// ========================================
console.group('4️⃣ Firebase Connection Test');
try {
  const { db } = await import('/src/lib/firebase');

  if (!db) {
    console.error('  ❌ Cannot test connection: db is undefined');
  } else {
    const { ref, get } = await import('firebase/database');
    console.log('  🔄 Testing database read...');

    // Try to read from a public path
    const testRef = ref(db, '.info/connected');
    const snapshot = await get(testRef);
    const connected = snapshot.val();

    if (connected) {
      console.log('  ✅ Firebase Realtime Database connection successful!');
    } else {
      console.log('  ⚠️  Firebase connection status: disconnected');
      console.log('     This is normal during initial connection. Wait a few seconds and check again.');
    }
  }
} catch (err) {
  console.error('  ❌ Connection test failed:', err);
  console.log('     Error details:', err.message);

  if (err.message.includes('permission')) {
    console.log('\n  🔧 This looks like a database rules issue:');
    console.log('     1. Check your Firebase Console > Realtime Database > Rules');
    console.log('     2. Ensure read/write permissions are set correctly');
    console.log('     3. For testing, you can temporarily set: { "rules": { ".read": true, ".write": true } }');
  }
}
console.groupEnd();

// ========================================
// 5. Check Authentication
// ========================================
console.group('5️⃣ Firebase Authentication Check');
try {
  const { auth } = await import('/src/lib/firebase');

  if (!auth) {
    console.error('  ❌ Cannot test auth: auth is undefined');
  } else {
    const { onAuthStateChanged } = await import('firebase/auth');
    console.log('  🔄 Checking authentication state...');

    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('  ✅ User authenticated successfully!');
        console.log(`     - User ID: ${user.uid}`);
        console.log(`     - Anonymous: ${user.isAnonymous}`);
      } else {
        console.log('  ⚠️  No user authenticated');
        console.log('     This might be normal if auth is still initializing');
      }
    });
  }
} catch (err) {
  console.error('  ❌ Auth check failed:', err);
}
console.groupEnd();

// ========================================
// 6. Network & Browser Check
// ========================================
console.group('6️⃣ Network & Browser Check');
console.log(`  Network Status: ${navigator.onLine ? '✅ Online' : '❌ Offline'}`);
console.log(`  User Agent: ${navigator.userAgent.substring(0, 80)}...`);

// Check for ad blockers or security extensions
if (typeof navigator.brave !== 'undefined') {
  console.log('  ⚠️  Brave browser detected - shields may block Firebase');
}

// Check local storage
try {
  localStorage.setItem('firebase_test', 'test');
  localStorage.removeItem('firebase_test');
  console.log('  Local Storage: ✅ Available');
} catch (err) {
  console.log('  Local Storage: ❌ Blocked (required for Firebase Auth)');
}

// Check for CORS issues
console.log('\n  💡 If you see CORS errors in the console:');
console.log('     - Check Firebase Console > Authentication > Settings > Authorized domains');
console.log('     - Add your production domain to the authorized list');
console.groupEnd();

// ========================================
// Summary
// ========================================
console.log('\n📋 SUMMARY');
console.log('══════════════════════════════════════════════════════════');
console.log('If you see ❌ errors above, common fixes are:');
console.log('');
console.log('1. Missing Environment Variables:');
console.log('   → Set all NEXT_PUBLIC_FIREBASE_* variables in your hosting provider');
console.log('   → Rebuild and redeploy after adding variables');
console.log('');
console.log('2. Firebase Not Initialized:');
console.log('   → Check browser console for detailed error messages');
console.log('   → Verify .env.local file exists and is not committed to git');
console.log('');
console.log('3. Connection Fails:');
console.log('   → Check Firebase Console > Realtime Database > Rules');
console.log('   → Verify database URL is correct');
console.log('   → Check for ad blockers or browser extensions blocking requests');
console.log('');
console.log('4. Authentication Fails:');
console.log('   → Enable Anonymous Authentication in Firebase Console');
console.log('   → Check Firebase Console > Authentication > Sign-in method');
console.log('   → Add your domain to authorized domains list');
console.log('══════════════════════════════════════════════════════════');
