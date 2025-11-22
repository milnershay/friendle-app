# Security Guide

This document outlines security considerations and best practices for Friendle.

## Current Security Measures

### 1. Firebase Realtime Database Rules

**Location:** `database.rules.json`

The database rules provide:
- ✅ Read access control
- ✅ Write validation for room creation
- ✅ Data structure validation
- ✅ Type checking (strings, numbers, etc.)
- ✅ Range validation (word length: 4-6, scores ≥ 0)
- ✅ Username length limits (1-30 characters)
- ✅ Game state validation
- ✅ Player status validation

### 2. Input Validation

**Location:** `src/lib/validation.ts`

Client-side validation for:
- ✅ Username format and length
- ✅ Room code format (6 characters, alphanumeric)
- ✅ Custom word validation
- ✅ Input sanitization

### 3. Rate Limiting

**Location:** `src/lib/validation.ts`

Basic client-side rate limiting:
- ✅ 5 room creations per minute per user
- ✅ Session-based tracking
- ✅ LocalStorage fallback

### 4. Security Headers

**Location:** `firebase.json`

Configured headers:
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`

### 5. HTTPS

- ✅ Automatic with Firebase Hosting
- ✅ Required for production

## Known Security Gaps

### ⚠️ Admin Panel (HIGH PRIORITY)

**Issue:** The `/admin` route has NO authentication

**Risk:** Anyone can access admin functions:
- View room statistics
- Clean up rooms
- See player counts

**Fix:** Add authentication before deploying to production.

**Options:**

#### Option 1: Simple Password (Quick)
```typescript
// src/app/admin/page.tsx
useEffect(() => {
  const password = prompt('Admin password:');
  if (password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    router.push('/');
  }
}, []);
```

#### Option 2: Firebase Auth (Recommended)
```typescript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Check if user has admin role
const auth = getAuth();
const user = auth.currentUser;
if (!user || !user.customClaims?.admin) {
  router.push('/');
}
```

#### Option 3: Middleware (Most Secure)
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check authentication here
  }
}
```

### ⚠️ Client-Side Rate Limiting (MEDIUM PRIORITY)

**Issue:** Rate limiting is client-side only

**Risk:** Can be bypassed by clearing localStorage/sessionStorage

**Fix:** Implement server-side rate limiting

**Options:**

#### Cloud Functions
```typescript
import * as functions from 'firebase-functions';

export const createRoom = functions.https.onCall(async (data, context) => {
  // Server-side rate limiting
  const ip = context.rawRequest.ip;
  // Check rate limit for this IP
  // Create room if allowed
});
```

#### Firebase App Check
```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('your-site-key'),
  isTokenAutoRefreshEnabled: true
});
```

### ⚠️ Word Validation (LOW PRIORITY)

**Issue:** Custom words are not validated against a dictionary

**Risk:** Players can enter invalid or inappropriate words

**Fix:** Add dictionary validation

**Options:**
- Use a word validation API
- Store valid words in Firebase and check against them
- Implement profanity filter

## Production Security Checklist

Before deploying to production:

### Critical
- [ ] **Add admin panel authentication**
- [ ] **Deploy database security rules**
- [ ] **Test all security rules**
- [ ] **Enable HTTPS**
- [ ] **Set up Firebase App Check**

### Important
- [ ] Implement server-side rate limiting
- [ ] Add error tracking (Sentry, LogRocket)
- [ ] Set up monitoring and alerts
- [ ] Review and test all Firebase rules
- [ ] Add CSRF protection if using cookies

### Recommended
- [ ] Add word validation/profanity filter
- [ ] Implement proper logging
- [ ] Add analytics (Firebase Analytics, Mixpanel)
- [ ] Set up automated security scanning
- [ ] Review dependencies for vulnerabilities (`npm audit`)

## Environment Variables

**Never commit these to version control:**

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Optional
NEXT_PUBLIC_ADMIN_PASSWORD=
```

**Best practices:**
- Use different Firebase projects for dev/staging/prod
- Rotate API keys regularly
- Use Firebase App Check in production
- Never expose private keys
- Use `.env.local` for local development
- Configure environment variables in hosting provider

## Common Security Threats

### 1. XSS (Cross-Site Scripting)

**Risk:** User input displayed without sanitization

**Mitigation:**
- ✅ React escapes by default
- ✅ No `dangerouslySetInnerHTML` used
- ✅ Security headers configured

**Additional steps:**
- Validate all user input
- Use Content Security Policy (CSP)

### 2. CSRF (Cross-Site Request Forgery)

**Risk:** Unauthorized actions on behalf of users

**Mitigation:**
- Using Firebase (not cookies)
- No server-side sessions

**Additional steps:**
- Add CSRF tokens if using cookies
- Validate `Origin` header

### 3. Data Injection

**Risk:** Malformed data causing errors or exploits

**Mitigation:**
- ✅ Firebase security rules validate data
- ✅ Client-side validation
- ✅ TypeScript type checking

**Additional steps:**
- Server-side validation in Cloud Functions
- Sanitize all inputs

### 4. DoS (Denial of Service)

**Risk:** Excessive requests overwhelming the system

**Mitigation:**
- ✅ Basic client-side rate limiting
- ✅ Firebase has built-in DoS protection

**Additional steps:**
- Server-side rate limiting
- Firebase App Check
- Cloudflare or similar DDoS protection

### 5. Data Leakage

**Risk:** Sensitive data exposed

**Mitigation:**
- ✅ Firebase rules restrict access
- ✅ No sensitive data stored
- ✅ HTTPS enforced

**Additional steps:**
- Audit what data is stored
- Implement field-level security
- Regular security reviews

## Monitoring and Alerts

### Firebase Console

Monitor:
- Database reads/writes (unusual spikes)
- Error rates
- Bandwidth usage
- Storage usage

Set up alerts for:
- Quota approaching limits
- Unusual activity patterns
- Error spikes

### Application Monitoring

Recommended tools:
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Firebase Analytics** - User analytics
- **Uptime Robot** - Uptime monitoring

## Incident Response

If you detect a security issue:

1. **Immediate:** Deploy emergency database rules to block writes
2. **Assess:** Review logs to understand the scope
3. **Mitigate:** Apply fixes and redeploy
4. **Communicate:** Inform affected users if needed
5. **Review:** Conduct post-mortem and improve security

## Regular Maintenance

### Weekly
- [ ] Check Firebase Console for anomalies
- [ ] Review error logs

### Monthly
- [ ] Run `npm audit` and update dependencies
- [ ] Review security rules
- [ ] Check for new security best practices

### Quarterly
- [ ] Security audit
- [ ] Penetration testing
- [ ] Update documentation

## Resources

- [Firebase Security Rules Guide](https://firebase.google.com/docs/rules)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

## Contact

For security issues, please:
1. Do NOT open a public issue
2. Email security concerns privately
3. Allow time for fixes before disclosure
