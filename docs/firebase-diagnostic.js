/**
 * FIREBASE DIAGNOSTIC SCRIPT
 *
 * Paste this into Chrome DevTools Console on the production site
 * to diagnose Firebase connection issues.
 *
 * Usage:
 * 1. Open Chrome DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Review the diagnostic output
 */

(async function firebaseDiagnostic() {
    console.log('🔍 FIREBASE DIAGNOSTIC STARTING...\n');
    console.log('='.repeat(80));

    // ========================================
    // 1. CHECK ENVIRONMENT VARIABLES
    // ========================================
    console.log('\n📋 STEP 1: Checking Environment Variables');
    console.log('-'.repeat(80));

    // Try to find env vars in the window object or Next.js runtime config
    const checkEnvVar = (name) => {
        // Check if it's exposed in window
        const windowValue = window[name];
        // Check process.env (won't work in browser, but try anyway)
        const processValue = typeof process !== 'undefined' && process.env ? process.env[name] : undefined;

        return {
            name,
            present: !!(windowValue || processValue),
            value: windowValue || processValue,
            source: windowValue ? 'window' : processValue ? 'process.env' : 'none'
        };
    };

    const envVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID'
    ];

    const envResults = {};
    envVars.forEach(varName => {
        const result = checkEnvVar(varName);
        envResults[varName] = result;

        if (varName.includes('API_KEY')) {
            // Don't show full API key for security
            console.log(`  ${result.present ? '✅' : '❌'} ${varName}: ${result.present ? 'PRESENT (hidden for security)' : '❌ MISSING'}`);
        } else if (varName.includes('DATABASE_URL')) {
            // Database URL is safe to show and critical for diagnosis
            console.log(`  ${result.present ? '✅' : '❌'} ${varName}: ${result.value || '❌ MISSING'}`);
        } else {
            console.log(`  ${result.present ? '✅' : '❌'} ${varName}: ${result.present ? '✓ Present' : '❌ MISSING'}`);
        }
    });

    const criticalMissing = !envResults.NEXT_PUBLIC_FIREBASE_API_KEY.present ||
                           !envResults.NEXT_PUBLIC_FIREBASE_DATABASE_URL.present ||
                           !envResults.NEXT_PUBLIC_FIREBASE_PROJECT_ID.present;

    if (criticalMissing) {
        console.error('\n⚠️  CRITICAL: Required environment variables are missing!');
        console.error('This indicates the build was deployed without proper env vars.');
        console.error('Action: Set these in your hosting platform (Vercel/Netlify) and redeploy.');
    }

    // ========================================
    // 2. CHECK FIREBASE INTERNAL STATE
    // ========================================
    console.log('\n\n🔥 STEP 2: Checking Firebase SDK State');
    console.log('-'.repeat(80));

    // Try to access firebase from window
    const firebase = window.firebase;

    if (firebase) {
        console.log('✅ Firebase SDK loaded');

        if (firebase.apps) {
            console.log(`  📱 Firebase Apps Initialized: ${firebase.apps.length}`);

            if (firebase.apps.length > 0) {
                const app = firebase.apps[0];
                console.log('  App Config:');
                console.log(`    - Name: ${app.name}`);
                console.log(`    - Options:`, app.options);

                // Check if database is available
                try {
                    const db = firebase.database();
                    console.log('  ✅ Database instance exists');
                    console.log(`    - Database URL: ${db.ref().toString()}`);
                } catch (e) {
                    console.error('  ❌ Database instance error:', e.message);
                }
            } else {
                console.error('  ❌ No Firebase apps initialized');
                console.error('  This means Firebase failed to initialize - likely due to missing config');
            }
        }
    } else {
        console.warn('⚠️  Firebase not found on window object');
        console.log('  Trying to check via imports...');

        // Try to check if firebase modules are loaded
        const scripts = Array.from(document.scripts).filter(s =>
            s.src.includes('firebase') || s.src.includes('firebaseapp')
        );

        if (scripts.length > 0) {
            console.log(`  ✅ Found ${scripts.length} Firebase script(s) loaded`);
            scripts.forEach(s => console.log(`    - ${s.src}`));
        } else {
            console.log('  ℹ️  No Firebase scripts found (may be bundled)');
        }
    }

    // ========================================
    // 3. TEST DIRECT FIREBASE REST API
    // ========================================
    console.log('\n\n🌐 STEP 3: Testing Direct Firebase REST API Connectivity');
    console.log('-'.repeat(80));

    const databaseURL = envResults.NEXT_PUBLIC_FIREBASE_DATABASE_URL.value;

    if (!databaseURL) {
        console.error('❌ Cannot test: DATABASE_URL is missing');
        console.error('This is the root cause - Firebase cannot connect without a database URL');
    } else {
        console.log(`Testing connection to: ${databaseURL}`);

        try {
            const testUrl = `${databaseURL}/rooms.json?shallow=true&limitToFirst=1`;
            console.log(`Fetching: ${testUrl}`);

            const response = await fetch(testUrl);

            console.log(`  Status: ${response.status} ${response.statusText}`);
            console.log(`  Headers:`, Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const data = await response.json();
                console.log('  ✅ Connection successful!');
                console.log(`  Response data:`, data);
                console.log('\n  🎉 Firebase REST API is reachable - the issue is in the app initialization');
            } else {
                console.error('  ❌ Connection failed');
                const errorText = await response.text();
                console.error(`  Error response:`, errorText);

                if (response.status === 401 || response.status === 403) {
                    console.error('\n  🔒 Authentication/Permission error');
                    console.error('  Check your Firebase database rules');
                }
            }
        } catch (error) {
            console.error('  ❌ Network error:', error.message);
            console.error('  This could indicate:');
            console.error('    - Invalid database URL');
            console.error('    - Network/CORS issues');
            console.error('    - Firebase project deleted/suspended');
        }
    }

    // ========================================
    // 4. CHECK NETWORK/CONSOLE ERRORS
    // ========================================
    console.log('\n\n🔍 STEP 4: Recent Console Errors');
    console.log('-'.repeat(80));
    console.log('Check the Console and Network tabs for errors like:');
    console.log('  - "Firebase: Error (auth/invalid-api-key)"');
    console.log('  - "Failed to get document because the client is offline"');
    console.log('  - CORS errors');
    console.log('  - Network failures to firebaseio.com');

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(80));

    const apiKeyPresent = envResults.NEXT_PUBLIC_FIREBASE_API_KEY.present;
    const dbUrlPresent = envResults.NEXT_PUBLIC_FIREBASE_DATABASE_URL.present;
    const projectIdPresent = envResults.NEXT_PUBLIC_FIREBASE_PROJECT_ID.present;

    if (!apiKeyPresent || !dbUrlPresent || !projectIdPresent) {
        console.error('\n❌ ROOT CAUSE: Missing Environment Variables');
        console.error('\nMissing variables:');
        if (!apiKeyPresent) console.error('  - NEXT_PUBLIC_FIREBASE_API_KEY');
        if (!dbUrlPresent) console.error('  - NEXT_PUBLIC_FIREBASE_DATABASE_URL');
        if (!projectIdPresent) console.error('  - NEXT_PUBLIC_FIREBASE_PROJECT_ID');

        console.error('\n🔧 FIX:');
        console.error('  1. Go to your hosting platform (Vercel/Netlify/etc.)');
        console.error('  2. Add these environment variables to your project settings');
        console.error('  3. Make sure they start with NEXT_PUBLIC_ (required for client-side access)');
        console.error('  4. Trigger a new deployment');
        console.error('\n  ⚠️  In Next.js, env vars are baked into the build at BUILD TIME');
        console.error('     Changing env vars requires a REDEPLOY, not just a restart');
    } else {
        console.log('\n✅ All required environment variables are present');
        console.log('If Firebase is still failing, check:');
        console.log('  1. Firebase console for project status');
        console.log('  2. Database rules (must allow read/write)');
        console.log('  3. Network tab for specific error messages');
    }

    console.log('\n' + '='.repeat(80));
    console.log('🏁 DIAGNOSTIC COMPLETE\n');
})();
